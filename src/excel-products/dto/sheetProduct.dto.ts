import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsUrl,
  Min,
} from 'class-validator';
import { ProductStatus } from '../../products/entities/product.entity';

const normalizeNumber = (v: any) => {
  if (v === null || v === undefined || v === '') return NaN;
  // reemplaza comas por punto y elimina espacios
  const s = String(v).replace(/\s+/g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
};

const normalizeString = (v: any) => (v === null || v === undefined ? '' : String(v).trim());

export class SheetsProductsDto {
  @IsOptional()
  @IsString()
  ID?: string; // Identificador único del producto (opcional para importación de compras)

  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => normalizeString(value))
  Nombre: string; // Nombre del producto

  @IsOptional()
  @IsString()
  @Transform(({ value }) => normalizeString(value))
  Descripcion: string; // Descripción del producto

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => {
    const n = normalizeNumber(value);
    return n;
  })
  PrecioVenta: number; // Precio de venta del producto

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => {
    const n = normalizeNumber(value);
    return n;
  })
  PrecioCompra: number; // Precio de compra del producto

  @IsOptional()
  @IsString()
  @Transform(({ value }) => normalizeString(value))
  SKU?: string; // Código SKU

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => {
    const n = parseInt(String(value).replace(/\s+/g, ''), 10);
    return Number.isFinite(n) ? n : NaN;
  })
  Stock: number; // Cantidad disponible

  @IsOptional()
  @IsEnum(ProductStatus)
  @Transform(({ value }) => {
    if (value === null || value === undefined || value === '') return undefined;
    const v = String(value).trim().toLowerCase();
    if (v === 'active' || v === 'activo') return ProductStatus.ACTIVE;
    if (v === 'inactive' || v === 'inactivo') return ProductStatus.INACTIVE;
    if (v === 'out_of_stock' || v === 'agotado' || v === 'outofstock') return ProductStatus.OUT_OF_STOCK;
    // si no reconocemos, devolvemos undefined para que @IsOptional lo ignore o haga fallar si no opcional
    return undefined;
  })
  Estado?: ProductStatus;

  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => normalizeString(value))
  Categorias: string;

  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => normalizeString(value))
  Proveedor: string; // Nombre del proveedor

  @IsOptional()
  @IsUrl()
  @Transform(({ value }) => normalizeString(value))
  Imagen?: string; // URL de la imagen del producto


  static getDescripcion(): string {
    return `
      ID: identificador único del producto.
      Nombre: nombre del producto.
      Descripcion: descripción del producto.
      PrecioVenta: precio de venta al público (acepta coma o punto).
      PrecioCompra: precio de compra (acepta coma o punto).
      SKU: código SKU.
      Stock: cantidad disponible en stock (entero).
      Estado: estado (active/activo, inactive/inactivo, out_of_stock/agotado).
      Categoria: categoría del producto.
      Proveedor: nombre del proveedor.
      Imagen: URL de la imagen del producto (opcional).
    `;
  }
}
