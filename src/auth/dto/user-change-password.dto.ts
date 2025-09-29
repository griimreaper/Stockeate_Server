import { IsNotEmpty, IsString } from 'class-validator';

export class UserChangePasswordDto {
  @IsString({ message: 'El campo $property debe ser un texto' })
  @IsNotEmpty({ message: 'El campo $property está vacío' })
    userId: string;

  @IsString({ message: 'El campo $property debe ser un texto' })
  @IsNotEmpty({ message: 'El campo $property está vacío' })
    username: string;
}
