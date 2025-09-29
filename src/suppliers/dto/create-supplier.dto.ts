import { IsString, IsOptional, IsEmail, IsArray, ValidateNested, IsNumber, ArrayMinSize, IsDate } from 'class-validator';
import { Type } from 'class-transformer';

class ProductInputDto {
  @IsString()
  name: string;

  @IsNumber()
  price: number;

  @IsNumber()
  quantity: number;
}

export class CreateSupplierDto {
  @IsString()
  name: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => SupplierProductDto)
  @IsOptional()
  products?: SupplierProductDto[];

  @IsOptional()
  @IsDate()
  date?: Date; // fecha de la compra
}

export class SupplierProductDto {
  @IsString()
  name: string;

  @IsNumber()
  price: number;

  @IsNumber()
  quantity: number;
}
