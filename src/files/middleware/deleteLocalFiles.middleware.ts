import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as fs from 'fs';

@Injectable()
export class DeleteLocalFileMiddleware implements NestMiddleware {
  constructor(private localFilePath: string) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Verifica si la respuesta es exitosa y si se ha especificado la ruta del archivo local
    if (res.statusCode === 201 && this.localFilePath) {
      try {
        // Elimina el archivo local utilizando fs.unlinkSync
        fs.unlinkSync(this.localFilePath);
      } catch (error) {
        // Maneja cualquier error que pueda ocurrir durante la eliminación del archivo local
        console.error('Error al eliminar el archivo local:', error);
        // Puedes decidir si quieres pasar el error al siguiente middleware o no
      }
    }
    // Llama al siguiente middleware
    next();
  }
}