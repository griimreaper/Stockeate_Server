import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

const normalizeString = (v: any) => (v === null || v === undefined ? '' : String(v).trim());

export class SheetsCategoryDto {
  @IsOptional()
  @IsUUID()
  ID?: string; // Identificador único de la categoría (opcional en importación, obligatorio en actualización)

  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => normalizeString(value))
  Nombre: string; // Nombre de la categoría

  @IsOptional()
  @IsString()
  @Transform(({ value }) => normalizeString(value))
  Productos?: string; // IDs de productos separados por coma

  static getDescripcion(): string {
    return `
      ID: identificador único de la categoría (opcional en importación, obligatorio en actualización).
      Nombre: nombre de la categoría (obligatorio).
      Productos: lista de IDs de productos separados por coma (opcional).
    `;
  }
}
