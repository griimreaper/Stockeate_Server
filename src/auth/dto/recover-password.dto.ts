import { IsEmail, IsNotEmpty } from 'class-validator';

export class RecoverPasswordDto {
  @IsNotEmpty({ message: 'El campo $property está vacío' })
  @IsEmail()
    email: string;
}
