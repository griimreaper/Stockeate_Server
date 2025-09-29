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
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth-guard';
import { RolesGuard } from '../auth/guards/rolesGuard';
import { Roles } from '../auth/decorator/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { GetUser } from '../auth/decorator/auth-user.decorator';
import { IGetUser } from '../auth/interfaces/getUser.interface';
import { ProductsService } from './products.service';
import { Op } from 'sequelize';

@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductsController {
  constructor(private readonly productService: ProductsService) { }

  // Listar productos del tenant
  @Get()
  async findAll(
    @GetUser() user: IGetUser,
    @Query('page') page = 1,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('limit') limit = '12',
    @Query('category') category = '',
    @Query('orderBy') orderBy?: string,
    @Query('order') order: 'ASC' | 'DESC' = 'DESC'
  ) {
    const options: any = { tenantId: user.tenantId };

    if (search) options.name = { [Op.iLike]: `%${search}%` };
    if (status && status !== 'all') options.status = status;

    const limitNum = Number(limit);
    const offset = (Number(page) - 1) * limitNum;

    const { data: products, total, categories } = await this.productService.findAllPaginated(
      options,
      limitNum,
      offset,
      category,
      orderBy,
      order,
    );

    const totalPages = Math.ceil(total / limitNum);

    return {
      data: products,
      total,
      page: Number(page),
      totalPages,
      prevPage: Number(page) > 1 ? Number(page) - 1 : undefined,
      nextPage: Number(page) < totalPages ? Number(page) + 1 : undefined,
      categories
    };
  }

  // Obtener producto por ID
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.CASHIER, UserRole.SUPERVISOR)
  findOne(@GetUser() user: IGetUser, @Param('id') id: string) {

    return this.productService.findOne(user.tenantId, id);
  }

  // Crear producto (solo ADMIN)
  @Post()
  @Roles(UserRole.ADMIN)
  create(@GetUser() user: IGetUser, @Body() createProductDto: CreateProductDto) {
    return this.productService.create(user.tenantId, createProductDto);
  }

  // Actualizar producto (solo ADMIN)
  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(
    @GetUser() user: IGetUser,
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productService.update(user.tenantId, id, updateProductDto);
  }

  // Eliminar producto (solo ADMIN)
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@GetUser() user: IGetUser, @Param('id') id: string) {
    return this.productService.remove(user.tenantId, id);
  }

}
