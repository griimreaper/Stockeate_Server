import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { User, UserRole } from './entities/user.entity';
import { Op } from 'sequelize';
import * as bcrypt from 'bcrypt';
import { CreateUserDto, UserFilters, UserResponse } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

// Define a plain User interface to match the response type (without Sequelize methods)
export interface PlainUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  tenantId: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User)
    private readonly userModel: typeof User,
  ) { }

  async create(tenantId: string, createUserDto: CreateUserDto, requesterRole: UserRole): Promise<PlainUser> {
    // Validate tenantId (SUPERADMIN can specify tenantId, ADMIN uses their own)
    if (requesterRole !== UserRole.SUPERADMIN && createUserDto.tenantId && createUserDto.tenantId !== tenantId) {
      throw new ForbiddenException('ADMIN solo puede crear usuarios para su propio tenant');
    }

    // Check for existing email
    const existingUser = await this.userModel.findOne({
      where: { email: createUserDto.email },
    });
    if (existingUser) {
      throw new ForbiddenException('El email ya está registrado');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const user = await this.userModel.create({
      ...createUserDto,
      password: hashedPassword,
      tenantId: requesterRole === UserRole.SUPERADMIN && createUserDto.tenantId ? createUserDto.tenantId : tenantId,
    });

    // Return plain object, excluding password
    return user.get({ plain: true });
  }

  async findAllPaginated(tenantId: string, filters: UserFilters, requesterRole: UserRole): Promise<UserResponse> {
    const { search, page, limit, order, orderBy } = filters;

    const where: any = {};
    // SUPERADMIN can access all users, ADMIN only their tenant
    if (requesterRole !== UserRole.SUPERADMIN) {
      where.tenantId = tenantId;
    }

    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const total = await this.userModel.count({ where });

    const users = await this.userModel.findAll({
      where,
      attributes: { exclude: ['password'] },
      order: [[orderBy, order]],
      limit,
      offset: (page - 1) * limit,
    });

    const totalPages = Math.ceil(total / limit);
    return {
      data: users.map((user) => user.get({ plain: true })), // Convert to plain objects
      total,
      page,
      totalPages,
      prevPage: page > 1 ? page - 1 : null,
      nextPage: page < totalPages ? page + 1 : null,
    };
  }

  async findOne(tenantId: string, id: string): Promise<PlainUser> {
    const user = await this.userModel.findOne({
      where: { id, tenantId },
      attributes: { exclude: ['password'] },
    });
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }
    return user.get({ plain: true }); // Return plain object
  }

  async update(tenantId: string, id: string, updateUserDto: UpdateUserDto, requesterRole: UserRole): Promise<PlainUser> {
    const user = await this.userModel.findOne({ where: { id, tenantId } });
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    // Check for email uniqueness if updating email
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.userModel.findOne({
        where: { email: updateUserDto.email },
      });
      if (existingUser) {
        throw new ForbiddenException('El email ya está registrado');
      }
    }

    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    await user.update(updateUserDto);
    return user.get({ plain: true }); // Return plain object
  }

  async remove(tenantId: string, id: string, requesterRole: UserRole): Promise<void> {
    const user = await this.userModel.findOne({ where: { id, tenantId } });
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    // Prevent deletion of SUPERADMIN users unless requester is SUPERADMIN
    if (user.role === UserRole.SUPERADMIN && requesterRole !== UserRole.SUPERADMIN) {
      throw new ForbiddenException('Solo SUPERADMIN puede eliminar usuarios SUPERADMIN');
    }

    await user.destroy();
  }

  async toggleActive(tenantId: string, id: string, requesterRole: UserRole): Promise<void> {
    const user = await this.userModel.findOne({ where: { id, tenantId } });
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    // Prevent toggling SUPERADMIN users unless requester is SUPERADMIN
    if (user.role === UserRole.SUPERADMIN && requesterRole !== UserRole.SUPERADMIN) {
      throw new ForbiddenException('Solo SUPERADMIN puede cambiar el estado de usuarios SUPERADMIN');
    }

    await user.update({ isActive: !user.isActive });
  }

  async findOneByEmail(email: string) {
    const user = await this.userModel.findOne({ where: { email } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}