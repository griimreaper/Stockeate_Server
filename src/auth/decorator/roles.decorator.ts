import { SetMetadata } from '@nestjs/common';

/**
 * Decorador para definir roles requeridos en rutas.
 * Utiliza metadatos para que el guard correspondiente los valide.
 *
 * @param roles - Lista de roles necesarios.
 */
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
