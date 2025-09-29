import { IsEmail, IsEnum, IsNotEmpty, MinLength, IsOptional, IsBoolean, IsUUID } from 'class-validator';
import { User, UserRole } from '../entities/user.entity';

export class CreateUserDto {
  @IsNotEmpty({ message: 'El nombre es requerido' })
  name: string;

  @IsEmail({}, { message: 'El email debe ser válido' })
  email: string;

  @IsNotEmpty({ message: 'La contraseña es requerida' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;

  @IsEnum(UserRole, { message: 'El rol debe ser válido' })
  @IsOptional()
  role?: UserRole = UserRole.CASHIER;

  @IsBoolean({ message: 'isActive debe ser un booleano' })
  @IsOptional()
  isActive?: boolean = true;

  @IsUUID('4', { message: 'El tenantId debe ser un UUID válido' })
  @IsOptional()
  tenantId?: string;
}

export interface UserFilters {
  search: string;
  page: number;
  limit: number;
  order: 'ASC' | 'DESC';
  orderBy: string;
}

export interface UserResponse {
  data: User[];
  total: number;
  page: number;
  totalPages: number;
  prevPage?: number;
  nextPage?: number;
}