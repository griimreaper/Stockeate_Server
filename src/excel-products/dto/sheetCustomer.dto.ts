import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, IsEmail } from 'class-validator';

const normalizeString = (v: any) => (v === null || v === undefined ? '' : String(v).trim());

export class SheetsCustomerDto {
  @IsOptional()
  @IsString()
  ID?: string; // Identificador único del cliente, útil para actualizaciones

  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => normalizeString(value))
  Nombre: string;

  @IsNotEmpty()
  @IsEmail()
  @Transform(({ value }) => normalizeString(value))
  Email: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => normalizeString(value))
  Telefono?: string;

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
      ID: identificador único del cliente (opcional para importación, obligatorio para actualización).
      Nombre: nombre completo del cliente.
      Email: correo electrónico válido del cliente.
      Telefono: teléfono del cliente (opcional).
      Ciudad: ciudad de residencia del cliente (opcional).
      Pais: país del cliente (opcional).
    `;
  }
}
