import { IsEmail, IsOptional, IsString, IsUUID } from "class-validator";

export class SheetsSupplierUpdateDto {
  @IsUUID()
  ID: string; // obligatorio para actualizar

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

  @IsOptional()
  @IsString()
  Pais?: string;
}
