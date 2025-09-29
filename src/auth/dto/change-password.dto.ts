import { IsNotEmpty, Matches, IsString } from 'class-validator';

export class ChangePasswordDto {
  @IsString({ message: 'El campo $property debe ser un texto' })
  @IsNotEmpty({ message: 'El campo $property está vacío' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[$@$!%*?&_])[A-Za-z\d$@$!%*?&]{8,15}/,
  )
  oldPassword: string;

  @IsString({ message: 'El campo $property debe ser un texto' })
  @IsNotEmpty({ message: 'El campo $property está vacío' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[$@$!%*?&_])[A-Za-z\d$@$!%*?&]{8,15}/,
  )
  newPassword: string;
}
