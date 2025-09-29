import { IsEmail, IsEnum, IsNotEmpty, MinLength, IsOptional, IsBoolean } from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class UpdateUserDto {
  @IsNotEmpty({ message: 'El nombre es requerido' })
  @IsOptional()
  name?: string;

  @IsEmail({}, { message: 'El email debe ser válido' })
  @IsOptional()
  email?: string;

  @IsNotEmpty({ message: 'La contraseña es requerida' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  @IsOptional()
  password?: string;

  @IsEnum(UserRole, { message: 'El rol debe ser válido' })
  @IsOptional()
  role?: UserRole;

  @IsBoolean({ message: 'isActive debe ser un booleano' })
  @IsOptional()
  isActive?: boolean;
}