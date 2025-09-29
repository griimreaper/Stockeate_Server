import { Injectable, NotFoundException, ForbiddenException, BadRequestException, HttpException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Tenant } from './entities/tenant.entity';
import { Op } from 'sequelize';
import { UserRole } from '../users/entities/user.entity';
import { CreateTenantDto, TenantFilters, TenantResponse } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class TenantsService {
  constructor(
    @InjectModel(Tenant)
    private readonly tenantModel: typeof Tenant,
  ) { }

  async create(createTenantDto: CreateTenantDto, requesterRole: UserRole): Promise<Tenant> {
    if (requesterRole !== UserRole.SUPERADMIN) {
      throw new ForbiddenException('Solo SUPERADMIN puede crear tenants');
    }

    const now = new Date();
    let subscriptionEnd: Date | null = null;
    if (createTenantDto.plan === 'free') {
      subscriptionEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 días
    } else if (createTenantDto.plan === 'monthly') {
      subscriptionEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 días
    }

    const tenant = await this.tenantModel.create({
      ...createTenantDto,
      subscriptionStart: now,
      subscriptionEnd,
    });
    return tenant.get({ plain: true });
  }

  async findAllPaginated(filters: TenantFilters): Promise<TenantResponse> {
    const { search, page, limit, order, orderBy } = filters;

    const where: any = {};
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { contactEmail: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const total = await this.tenantModel.count({ where });

    const tenants = await this.tenantModel.findAll({
      where,
      order: [[orderBy, order]],
      limit,
      offset: (page - 1) * limit,
    });

    const totalPages = Math.ceil(total / limit);
    return {
      data: tenants.map((tenant) => tenant.get({ plain: true })),
      total,
      page,
      totalPages,
      prevPage: page > 1 ? page - 1 : null,
      nextPage: page < totalPages ? page + 1 : null,
    };
  }

  async findOne(id: string): Promise<Tenant> {
    const tenant = await this.tenantModel.findOne({ where: { id } });
    if (!tenant) {
      throw new NotFoundException(`Tenant con ID ${id} no encontrado`);
    }
    return tenant;
  }

  async update(id: string, updateTenantDto: UpdateTenantDto, requesterRole: UserRole): Promise<Tenant> {
    if (requesterRole !== UserRole.SUPERADMIN && requesterRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Solo admin puede actualizar tenants');
    }

    const tenant = await this.tenantModel.findOne({ where: { id } });
    if (!tenant) {
      throw new NotFoundException(`Tenant con ID ${id} no encontrado`);
    }

    await tenant.update(updateTenantDto);
    return tenant.get({ plain: true });
  }

  async remove(id: string, requesterRole: UserRole): Promise<void> {
    if (requesterRole !== UserRole.SUPERADMIN) {
      throw new ForbiddenException('Solo SUPERADMIN puede eliminar tenants');
    }

    const tenant = await this.tenantModel.findOne({ where: { id } });
    if (!tenant) {
      throw new NotFoundException(`Tenant con ID ${id} no encontrado`);
    }

    await tenant.destroy();
  }

  async toggleActive(id: string, requesterRole: UserRole): Promise<void> {
    if (requesterRole !== UserRole.SUPERADMIN) {
      throw new ForbiddenException('Solo SUPERADMIN puede cambiar el estado de tenants');
    }

    const tenant = await this.tenantModel.findOne({ where: { id } });
    if (!tenant) {
      throw new NotFoundException(`Tenant con ID ${id} no encontrado`);
    }

    await tenant.update({ isActive: !tenant.isActive });
  }

  async renewSubscription(id: string, plan: string, requesterRole: UserRole): Promise<Tenant> {
    if (requesterRole !== UserRole.SUPERADMIN && requesterRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Solo ADMIN puede renovar suscripciones');
    }

    const transaction = await Tenant.sequelize.transaction();

    try {
      const tenant = await Tenant.findByPk(id, { transaction }); // tenantModel es @InjectModel(Tenant)
      if (!tenant) {
        throw new HttpException('Tenant no encontrado', 404);
      }

      // Calcular fechas nuevas
      const now = new Date();
      let subscriptionEnd = new Date(now);

      switch (plan) {
        case 'weekly':
          subscriptionEnd.setDate(now.getDate() + 7);
          break;
        case 'monthly':
          subscriptionEnd.setMonth(now.getMonth() + 1);
          // Ajuste para fin de mes si es necesario (ej. de 31 a 28/29)
          if (subscriptionEnd.getDate() !== now.getDate()) {
            subscriptionEnd.setDate(0); // Último día del mes anterior al siguiente
          }
          break;
        case 'annual':
          subscriptionEnd.setFullYear(now.getFullYear() + 1);
          // Manejo de años bisiestos
          if (subscriptionEnd.getDate() !== now.getDate()) {
            subscriptionEnd.setDate(0);
          }
          break;
        default:
          throw new HttpException('Plan inválido', 400);
      }

      // Actualizar el tenant
      await tenant.update({
        plan,
        subscriptionStart: now,
        subscriptionEnd,
        isActive: true, // Reactivar si estaba inactivo
      }, { transaction });

      await transaction.commit();

      return tenant; // Retorna el tenant actualizado para el frontend
    } catch (error) {
      await transaction.rollback();
      throw new HttpException(error.message || 'Error al renovar la suscripción', error.status || 500);
    }
  }

  async updateCustomization(
    id: string,
    customization: Partial<Tenant['customization']>,
  ): Promise<Tenant> {
    const tenant = await this.tenantModel.findByPk(id);
    if (!tenant) throw new Error('Tenant no encontrado');

    // Merge: mantener los valores existentes y actualizar solo los que llegan
    tenant.customization = { ...tenant.customization, ...customization };
    return tenant.save();
  }

  @Cron('0 0 * * *') // Cada día a medianoche
  async checkExpiredSubscriptions(): Promise<void> {
    const now = new Date();
    await this.tenantModel.update(
      { isActive: false },
      {
        where: {
          subscriptionEnd: { [Op.lt]: now },
          isActive: true,
        },
      },
    );
  }
}