import { IsOptional, IsString, IsNumber, Min, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { ProductStatus } from '../../products/entities/product.entity';

const normalizeNumber = (v: any) => {
  if (v === null || v === undefined || v === '') return NaN;
  const s = String(v).replace(/\s+/g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
};

const normalizeString = (v: any) => (v === null || v === undefined ? '' : String(v).trim());

export class SheetsProductsUpdateDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => normalizeString(value))
  ID?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => normalizeString(value))
  Nombre?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => normalizeString(value))
  Descripcion?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => normalizeNumber(value))
  PrecioVenta?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseInt(String(value).replace(/\s+/g, ''), 10))
  Stock?: number;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => normalizeString(value))
  SKU?: string;

  @IsOptional()
  @IsEnum(ProductStatus)
  @Transform(({ value }) => {
    if (value === null || value === undefined || value === '') return undefined;
    const v = String(value).trim().toLowerCase();
    if (v === 'active' || v === 'activo') return ProductStatus.ACTIVE;
    if (v === 'inactive' || v === 'inactivo') return ProductStatus.INACTIVE;
    if (v === 'out_of_stock' || v === 'agotado' || v === 'outofstock') return ProductStatus.OUT_OF_STOCK;
    return undefined;
  })
  Estado?: ProductStatus;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => normalizeString(value))
  Categoria?: string;
}
