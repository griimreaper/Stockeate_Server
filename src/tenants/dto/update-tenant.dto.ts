import { IsNotEmpty, IsOptional, IsString, IsEmail, IsObject } from 'class-validator';

export class UpdateTenantDto {
    @IsNotEmpty({ message: 'El nombre es requerido' })
    @IsOptional()
    name?: string;

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
    plan?: string;

    @IsOptional()
    subscriptionEnd?: Date;
}