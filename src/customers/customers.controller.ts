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
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth-guard';
import { RolesGuard } from '../auth/guards/rolesGuard';
import { Roles } from '../auth/decorator/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { GetUser } from '../auth/decorator/auth-user.decorator';
import { IGetUser } from '../auth/interfaces/getUser.interface';
import { CustomersService } from './customers.service';
import { Op } from 'sequelize';

@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  // Listar clientes del tenant con filtros
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

    if (search) options.name = { [Op.iLike]: `%${search}%` };

    const limitNum = Number(limit);
    const offset = (Number(page) - 1) * limitNum;

    const { data: customers, total } = await this.customersService.findAllPaginated(
      options,
      limitNum,
      offset,
      orderBy,
      order,
    );

    const totalPages = Math.ceil(total / limitNum);

    return {
      data: customers,
      total,
      page: Number(page),
      totalPages,
      prevPage: Number(page) > 1 ? Number(page) - 1 : undefined,
      nextPage: Number(page) < totalPages ? Number(page) + 1 : undefined,
    };
  }

  // Obtener cliente por ID
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.CASHIER, UserRole.SUPERVISOR)
  findOne(@GetUser() user: IGetUser, @Param('id') id: string) {
    return this.customersService.findOne(user.tenantId, id);
  }

  // Crear cliente (solo ADMIN)
  @Post()
  @Roles(UserRole.ADMIN)
  create(@GetUser() user: IGetUser, @Body() createCustomerDto: CreateCustomerDto) {
    return this.customersService.create(user.tenantId, createCustomerDto);
  }

  // Actualizar cliente (solo ADMIN)
  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(
    @GetUser() user: IGetUser,
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ) {
    return this.customersService.update(user.tenantId, id, updateCustomerDto);
  }

  // Eliminar cliente (solo ADMIN)
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@GetUser() user: IGetUser, @Param('id') id: string) {
    return this.customersService.remove(user.tenantId, id);
  }
}
