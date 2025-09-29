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
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth-guard';
import { RolesGuard } from '../auth/guards/rolesGuard';
import { Roles } from '../auth/decorator/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { GetUser } from '../auth/decorator/auth-user.decorator';
import { IGetUser } from '../auth/interfaces/getUser.interface';
import { SuppliersService } from './suppliers.service';
import { Op } from 'sequelize';

@Controller('suppliers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  // Listar proveedores del tenant con filtros
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

    const { data: suppliers, total } = await this.suppliersService.findAllPaginated(
      options,
      limitNum,
      offset,
      orderBy,
      order,
    );

    const totalPages = Math.ceil(total / limitNum);

    return {
      data: suppliers,
      total,
      page: Number(page),
      totalPages,
      prevPage: Number(page) > 1 ? Number(page) - 1 : undefined,
      nextPage: Number(page) < totalPages ? Number(page) + 1 : undefined,
    };
  }

  // Obtener proveedor por ID
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.CASHIER, UserRole.SUPERVISOR)
  findOne(@GetUser() user: IGetUser, @Param('id') id: string) {
    return this.suppliersService.findOne(user.tenantId, id);
  }

  // Crear proveedor (solo ADMIN)
  @Post()
  @Roles(UserRole.ADMIN)
  create(@GetUser() user: IGetUser, @Body() createSupplierDto: CreateSupplierDto) {
    return this.suppliersService.create(user.tenantId, createSupplierDto);
  }

  // Actualizar proveedor (solo ADMIN)
  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(
    @GetUser() user: IGetUser,
    @Param('id') id: string,
    @Body() updateSupplierDto: UpdateSupplierDto,
  ) {
    return this.suppliersService.update(user.tenantId, id, updateSupplierDto);
  }

  // Eliminar proveedor (solo ADMIN)
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@GetUser() user: IGetUser, @Param('id') id: string) {
    return this.suppliersService.remove(user.tenantId, id);
  }
}
