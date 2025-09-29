import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, IsEmail, IsUUID } from 'class-validator';

const normalizeString = (v: any) => (v === null || v === undefined ? '' : String(v).trim());

export class SheetsSupplierDto {
  @IsOptional()
  @IsUUID()
  ID?: string; // Identificador único del proveedor (opcional en importación, obligatorio en actualización)

  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => normalizeString(value))
  Nombre: string; // Nombre de la empresa o proveedor

  @IsOptional()
  @IsEmail()
  @Transform(({ value }) => normalizeString(value))
  Email?: string; // Correo del proveedor (opcional)

  @IsOptional()
  @IsString()
  @Transform(({ value }) => normalizeString(value))
  Teléfono?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => normalizeString(value))
  Ciudad?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => normalizeString(value))
  Localidad?: string;

  static getDescripcion(): string {
    return `
      ID: identificador único del proveedor (opcional en importación, obligatorio en actualización).
      Nombre: nombre o razón social del proveedor.
      Email: correo electrónico de contacto del proveedor (opcional).
      Telefono: número de teléfono del proveedor (opcional).
      Ciudad: ciudad donde se encuentra el proveedor (opcional).
      Pais: país del proveedor (opcional).
    `;
  }
}
