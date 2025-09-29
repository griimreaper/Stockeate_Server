import { IsUUID, IsOptional, IsArray, ValidateNested, IsString, IsNumber, IsDateString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus } from 'src/orders/entities/order.entity'; // Asumiendo que OrderStatus está definido aquí

class OrderItemDto {
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

class CustomerInputDto {
  @IsOptional()
  @IsUUID()
  id?: string; // Si existe, se usa

  @IsOptional()
  @IsString()
  name?: string; // Nombre del cliente, opcional para buscar si id no está

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class CreateOrderDto {
  @ValidateNested()
  @Type(() => CustomerInputDto)
  customer: CustomerInputDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsOptional()
  @IsDateString()
  orderDate?: string; // Fecha de la orden, opcional (formato ISO)

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus; // Estado de la orden (pending, completed, cancelled)
}