import { Body, Controller, Get, Param, Post, Query, Res, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { ExcelService } from './excel.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth-guard';
import { RolesGuard } from 'src/auth/guards/rolesGuard';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { UserRole } from 'src/users/entities/user.entity';
import { Request, Response } from 'express';
import { GetUser } from 'src/auth/decorator/auth-user.decorator';
import { IGetUser } from 'src/auth/interfaces/getUser.interface';

@Controller('excel')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExcelController {
  constructor(private readonly excelService: ExcelService) { }

  /**
   * Importar o actualizar datos desde Excel
   * entity: Nombre de la entidad (product, customer, supplier...)
   * mode: "import" o "update"
   */
  @Post(':entity')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async importOrUpdate(
    @Param('entity') entity: string,
    @Body('url') url: string,
    @Body('mode') mode: 'import' | 'update',
    @GetUser() user: IGetUser,
    @Req() req: Request
  ) {
    req.setTimeout(1200000); // 20 min

    const sheetsData = await this.excelService.getSheetsData(url);
    const jsonData = await this.excelService.spreadSheetsToJSON(sheetsData);

    // ✅ Generalizar validación de coherencia para cualquier entidad
    const ENTITY_KEYS: Record<string, string> = {
      product: 'ID',
      customer: 'ID',
      supplier: 'ID',
      purchase: 'ID',
      categories: 'ID',
      orders: 'ID',
      purchases: 'ID',
      users: 'ID',
      tenants: 'ID'
      // agregar más entidades si hace falta
    };

    const keyField = ENTITY_KEYS[entity.toLowerCase()];
    if (!keyField) throw new BadRequestException(`Entidad desconocida: ${entity}`);

    const hasKeyColumn = keyField in jsonData[0];
    if (mode === 'update' && !hasKeyColumn) {
      throw new BadRequestException(`Modo "update" inválido: el Excel no contiene columna ${keyField}.`);
    }
    if (mode === 'import' && hasKeyColumn) {
      throw new BadRequestException(`Modo "import" inválido: el Excel contiene columna ${keyField}.`);
    }

    return this.excelService.processExcel(user.tenantId, entity, jsonData, mode);
  }


  /**
   * Exportar datos a Excel
   */
  @Get('export/:entity')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async exportEntity(@Param('entity') entity: string, @Res() res: Response) {
    const buffer = await this.excelService.exportEntity(entity);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${entity}.xlsx"`);
    res.send(buffer);
  }

  /**
   * Descargar ejemplo de importación
   */
  @Get('example/:entity')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async exampleEntity(@Param('entity') entity: string, @Res() res: Response) {
    const buffer = await this.excelService.generateExample(entity);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="ejemplo_${entity}.xlsx"`);
    res.send(buffer);
  }
}
