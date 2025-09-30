import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth-guard';
import { RolesGuard } from '../auth/guards/rolesGuard';
import { Roles } from '../auth/decorator/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { GetUser } from '../auth/decorator/auth-user.decorator';
import { IGetUser } from '../auth/interfaces/getUser.interface';
import { Op } from 'sequelize';
import { PurchasesService } from '../purchases/purchases.service';
import { UpdatePurchaseDto } from '../purchases/dto/update-purchase.dto';
import { CreatePurchaseDto } from '../purchases/dto/create-purchase.dto';

@Controller('purchases')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  // Listar compras del tenant con filtros
  @Get()
  async findAll(
    @GetUser() user: IGetUser,
    @Query('page') page = 1,
    @Query('search') search?: string,
    @Query('limit') limit = '12',
    @Query('orderBy') orderBy?: string,
    @Query('order') order: 'ASC' | 'DESC' = 'DESC',
  ) {
    const options: any = { tenantId: user.tenantId };

    if (search) options.supplierName = { [Op.iLike]: `%${search}%` };

    const limitNum = Number(limit);
    const offset = (Number(page) - 1) * limitNum;

    const { data: purchases, total } = await this.purchasesService.findAllPaginated(
      options,
      limitNum,
      offset,
      orderBy,
      order,
    );

    const totalPages = Math.ceil(total / limitNum);

    return {
      data: purchases,
      total,
      page: Number(page),
      totalPages,
      prevPage: Number(page) > 1 ? Number(page) - 1 : undefined,
      nextPage: Number(page) < totalPages ? Number(page) + 1 : undefined,
    };
  }

  // Obtener compra por ID (incluye proveedores y productos)
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.CASHIER, UserRole.SUPERVISOR)
  findOne(@GetUser() user: IGetUser, @Param('id') id: string) {
    return this.purchasesService.findOne(user.tenantId, id);
  }

  // Crear compra (solo ADMIN)
  @Post()
  @Roles(UserRole.ADMIN)
  create(@GetUser() user: IGetUser, @Body() createPurchaseDto: CreatePurchaseDto) {
    return this.purchasesService.create(user.tenantId, user.userId, createPurchaseDto);
  }

  // Actualizar compra (solo ADMIN)
  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(
    @GetUser() user: IGetUser,
    @Param('id') id: string,
    @Body() updatePurchaseDto: UpdatePurchaseDto,
  ) {
    return this.purchasesService.update(user.tenantId, id, updatePurchaseDto);
  }

  // Eliminar compra (solo ADMIN)
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@GetUser() user: IGetUser, @Param('id') id: string) {
    return this.purchasesService.remove(user.tenantId, id);
  }
}