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
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth-guard';
import { RolesGuard } from '../auth/guards/rolesGuard';
import { Roles } from '../auth/decorator/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { GetUser } from '../auth/decorator/auth-user.decorator';
import { IGetUser } from '../auth/interfaces/getUser.interface';
import { Op } from 'sequelize';
import { OrderStatus } from './entities/order.entity';

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) { }

  // Listar órdenes del tenant con filtros
  @Get()
  async findAll(
    @GetUser() user: IGetUser,
    @Query('page') page = 1,
    @Query('search') search?: string,
    @Query('limit') limit = '12',
    @Query('orderBy') orderBy?: string,
    @Query('order') order: 'ASC' | 'DESC' = 'DESC',
    @Query('status') status?: OrderStatus & 'all',
  ) {
    const options: any = { tenantId: user.tenantId };

    if (status && status !== 'all') options.status = status;

    const limitNum = Number(limit);
    const offset = (Number(page) - 1) * limitNum;

    const { data: orders, total } = await this.ordersService.findAllPaginated(
      options,
      limitNum,
      offset,
      orderBy,
      order,
      search
    );

    const totalPages = Math.ceil(total / limitNum);

    return {
      data: orders,
      total,
      page: Number(page),
      totalPages,
      prevPage: Number(page) > 1 ? Number(page) - 1 : undefined,
      nextPage: Number(page) < totalPages ? Number(page) + 1 : undefined,
    };
  }

  // Obtener orden por ID (incluye clientes y productos)
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.CASHIER, UserRole.SUPERVISOR)
  findOne(@GetUser() user: IGetUser, @Param('id') id: string) {
    return this.ordersService.findOne(user.tenantId, id);
  }

  // Crear orden (solo ADMIN)
  @Post()
  @Roles(UserRole.ADMIN)
  create(@GetUser() user: IGetUser, @Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(user.tenantId, user.userId, createOrderDto);
  }

  // Actualizar orden (solo ADMIN)
  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(
    @GetUser() user: IGetUser,
    @Param('id') id: string,
    @Body() updateOrderDto: UpdateOrderDto,
  ) {
    return this.ordersService.update(user.tenantId, id, updateOrderDto);
  }

  // Eliminar orden (solo ADMIN)
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@GetUser() user: IGetUser, @Param('id') id: string) {
    return this.ordersService.remove(user.tenantId, id);
  }
}
