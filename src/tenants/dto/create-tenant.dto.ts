import { IsNotEmpty, IsOptional, IsString, IsEmail, IsObject, IsEnum, IsDateString } from 'class-validator';
import { Tenant } from '../entities/tenant.entity';

export class CreateTenantDto {
  @IsNotEmpty({ message: 'El nombre es requerido' })
  name: string;

  @IsString({ message: 'El dominio debe ser una cadena' })
  @IsOptional()
  domain?: string;

  @IsEmail({}, { message: 'El email debe ser válido' })
  @IsOptional()
  contactEmail?: string;

  @IsObject({ message: 'La personalización debe ser un objeto' })
  @IsOptional()
  customization?: {
    primaryColor?: string;
    secondaryColor?: string;
    iconColor?: string;
    logoUrl?: string;
  };

  @IsString({ message: 'El teléfono debe ser una cadena' })
  @IsOptional()
  phone?: string;

  @IsString({ message: 'El plan debe ser válido' })
  @IsOptional()
  plan?: string = 'free'; // Default 'free'
}

export interface TenantFilters {
  search: string;
  page: number;
  limit: number;
  order: 'ASC' | 'DESC';
  orderBy: string;
}

export interface TenantResponse {
  data: Tenant[];
  total: number;
  page: number;
  totalPages: number;
  prevPage?: number;
  nextPage?: number;
}