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
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth-guard';
import { RolesGuard } from '../auth/guards/rolesGuard';
import { Roles } from '../auth/decorator/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { GetUser } from '../auth/decorator/auth-user.decorator';
import { IGetUser } from '../auth/interfaces/getUser.interface';
import { CategoriesService } from './categories.service';
import { Op } from 'sequelize';

@Controller('categories')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  // Listar categorías del tenant con filtros
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

    const { data: categories, total } = await this.categoriesService.findAllPaginated(
      options,
      limitNum,
      offset,
      orderBy,
      order,
    );

    const totalPages = Math.ceil(total / limitNum);

    return {
      data: categories,
      total,
      page: Number(page),
      totalPages,
      prevPage: Number(page) > 1 ? Number(page) - 1 : undefined,
      nextPage: Number(page) < totalPages ? Number(page) + 1 : undefined,
    };
  }

  // Obtener categoría por ID
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.CASHIER, UserRole.SUPERVISOR)
  findOne(@GetUser() user: IGetUser, @Param('id') id: string) {
    return this.categoriesService.findOne(user.tenantId, id);
  }

  // Crear categoría (solo ADMIN)
  @Post()
  @Roles(UserRole.ADMIN)
  create(@GetUser() user: IGetUser, @Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(user.tenantId, createCategoryDto);
  }

  // Actualizar categoría (solo ADMIN)
  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(
    @GetUser() user: IGetUser,
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(user.tenantId, id, updateCategoryDto);
  }

  // Eliminar categoría (solo ADMIN)
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@GetUser() user: IGetUser, @Param('id') id: string) {
    return this.categoriesService.remove(user.tenantId, id);
  }
}
