import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, IsUUID, IsDateString } from 'class-validator';

const normalizeString = (v: any) => (v === null || v === undefined ? '' : String(v).trim());

export class SheetsPurchaseDto {
  @IsOptional()
  @IsUUID()
  ID?: string; // Identificador único de la compra (se mantiene con ID)

  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => normalizeString(value))
  Proveedor: string; // Nombre del proveedor

  @IsNotEmpty()
  @IsDateString()
  Fecha: string; // Fecha de la compra (ISO)

  @IsOptional()
  @IsString()
  @Transform(({ value }) => normalizeString(value))
  Productos?: string; // Nombres de productos separados por coma

  @IsOptional()
  @IsString()
  @Transform(({ value }) => normalizeString(value))
  Cantidades?: string; // Cantidades separadas por coma

  @IsOptional()
  @IsString()
  @Transform(({ value }) => normalizeString(value))
  Precios?: string; // Precios separados por coma

  static getDescription(): string {
    return `
      ID: identificador único de la compra (opcional en importación, obligatorio en actualización).
      Proveedor: nombre del proveedor asociado (obligatorio).
      Fecha: fecha de creación de la compra (formato ISO).
      Productos: lista de nombres de productos separados por coma (ej: "Camiseta Roja,Shorts").
      Cantidades: cantidades separadas por coma, alineadas por índice con Productos (ej: "2,1").
      Precios: precios unitarios separados por coma, alineados por índice con Productos (ej: "50,50").
    `;
  }
}