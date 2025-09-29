import { IsUUID, IsOptional, IsArray, ValidateNested, IsString, IsNumber, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

class PurchaseItemDto {
  @IsOptional()
  @IsUUID()
  productId?: string; // Opcional, se usará si está presente

  @IsOptional()
  @IsString()
  name?: string; // Nombre del producto, opcional para buscar si productId no está

  @IsNumber()
  quantity: number;

  @IsNumber()
  price: number;
}

class SupplierInputDto {
  @IsOptional()
  @IsUUID()
  id?: string; // Si existe, se usa

  @IsOptional()
  @IsString()
  name?: string; // Nombre del proveedor, opcional para buscar si id no está

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class CreatePurchaseDto {
  @ValidateNested()
  @Type(() => SupplierInputDto)
  supplier: SupplierInputDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemDto)
  items: PurchaseItemDto[];

  @IsOptional()
  @IsDateString()
  date?: string; // Fecha de la compra, opcional (formato ISO)
}

export class UpdatePurchaseDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => SupplierInputDto)
  supplier?: SupplierInputDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemDto)
  items?: PurchaseItemDto[];

  @IsOptional()
  @IsDateString()
  date?: string; // Fecha de la compra, opcional (formato ISO)
}