import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProductStatus } from '../entities/product.entity';

// DTO para categorías individuales
export class CategoryDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  name?: string;
}

export class CreateProductDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  price: number;

  @IsNumber()
  stock: number;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  // 👇 soporte real para múltiples categorías como objetos
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CategoryDto)
  categories?: CategoryDto[];

  @IsOptional()
  @IsString()
  url?: string;
}
