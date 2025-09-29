import { IsNotEmpty, Matches, IsString } from 'class-validator';

export class ResetPasswordDto {
  @IsString({ message: 'El campo $property debe ser un texto' })
  @IsNotEmpty({ message: 'El campo $property está vacío' })
  @Matches(
    /^(?=.*[A-Za-zñÑáéíóúÁÉÍÓÚàèìòùÀÈÌÒÙâêîôûÂÊÎÔÛ])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])[A-Za-zñÑáéíóúÁÉÍÓÚàèìòùÀÈÌÒÙâêîôûÂÊÎÔÛ\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{8,}$/,
    {
      message:
        'La contraseña debe ser de 8 a 15 caracteres, tener una mayúscula, una minúscula, un número y un carácter especial',
    },
  )
  newPassword: string;
}
