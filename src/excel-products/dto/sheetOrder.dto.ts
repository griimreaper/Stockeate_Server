import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, IsUUID, IsEnum, IsDateString } from 'class-validator';
import { OrderStatus } from '../../orders/entities/order.entity';

const normalizeString = (v: any) => (v === null || v === undefined ? '' : String(v).trim());

export class SheetsOrderDto {
  @IsOptional()
  @IsUUID()
  ID?: string; // Identificador único de la orden (se mantiene con ID)

  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => normalizeString(value))
  Cliente: string; // Nombre del cliente

  @IsOptional()
  @IsString()
  @Transform(({ value }) => normalizeString(value))
  Usuario?: string; // Nombre del usuario (opcional)

  @IsNotEmpty()
  @IsEnum(OrderStatus)
  Estado: OrderStatus; // Estado de la orden

  @IsNotEmpty()
  @IsDateString()
  Fecha: string; // Fecha de la orden (ISO)

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

  static getDescripcion(): string {
    return `
      ID: identificador único de la orden (opcional en importación, obligatorio en actualización).
      Cliente: nombre del cliente asociado (obligatorio).
      Usuario: nombre del usuario asociado (opcional).
      Estado: estado de la orden (pending, completed, cancelled).
      Fecha: fecha de creación de la orden (formato ISO).
      Productos: lista de nombres de productos separados por coma (ej: "Camiseta Roja,Shorts").
      Cantidades: cantidades separadas por coma, alineadas por índice con Productos (ej: "2,1").
      Precios: precios unitarios separados por coma, alineados por índice con Productos (ej: "50,50").
    `;
  }
}