import { Controller, Get, Post, Patch, Delete, Query, Param, Body, UseGuards } from '@nestjs/common';
import { PlainUser, UsersService } from './users.service';
import { CreateUserDto, UserFilters } from './dto/create-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth-guard';
import { RolesGuard } from '../auth/guards/rolesGuard';
import { UserRole } from './entities/user.entity';
import { Roles } from '../auth/decorator/roles.decorator';
import { GetUser } from '../auth/decorator/auth-user.decorator';
import { IGetUser } from '../auth/interfaces/getUser.interface';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Crear usuario (solo ADMIN o SUPERADMIN)
  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  create(@GetUser() user: IGetUser, @Body() createUserDto: CreateUserDto): Promise<PlainUser> {
    return this.usersService.create(user.tenantId, createUserDto, user.role);
  }

  // Listar usuarios del tenant con filtros y paginación
  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  findAll(@GetUser() user: IGetUser, @Query() filters: UserFilters) {
    return this.usersService.findAllPaginated(user.tenantId, filters, user.role);
  }

  // Obtener usuario por ID dentro del tenant
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  findOne(@GetUser() user: IGetUser, @Param('id') id: string): Promise<PlainUser> {
    return this.usersService.findOne(user.tenantId, id);
  }

  // Actualizar usuario (solo ADMIN o SUPERADMIN)
  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  update(
    @GetUser() user: IGetUser,
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<PlainUser> {
    return this.usersService.update(user.tenantId, id, updateUserDto, user.role);
  }

  // Eliminar usuario (solo ADMIN o SUPERADMIN)
  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  remove(@GetUser() user: IGetUser, @Param('id') id: string): Promise<void> {
    return this.usersService.remove(user.tenantId, id, user.role);
  }

  // Cambiar estado isActive (solo ADMIN o SUPERADMIN)
  @Patch(':id/toggle-active')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  toggleActive(@GetUser() user: IGetUser, @Param('id') id: string): Promise<void> {
    return this.usersService.toggleActive(user.tenantId, id, user.role);
  }
}