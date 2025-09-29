import { IsEmail, IsOptional, IsString, IsUUID } from "class-validator";

export class SheetsCustomerUpdateDto {
  @IsUUID()
  ID: string; // el Excel debe traer esta columna para poder actualizar

  @IsOptional()
  @IsString()
  Nombre?: string;

  @IsOptional()
  @IsEmail()
  Email?: string;

  @IsOptional()
  @IsString()
  Teléfono?: string;

  @IsOptional()
  @IsString()
  Ciudad?: string;

  @IsOptional()
  @IsString()
  Localidad?: string;
}
