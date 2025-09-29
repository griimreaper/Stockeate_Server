import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'El correo electrónico debe ser válido' })
  email: string;

  @IsString({ message: 'La contraseña debe ser una cadena' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password: string;
}