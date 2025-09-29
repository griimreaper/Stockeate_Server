import { HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Customer } from './entities/customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import * as xlsx from "xlsx";
import { SheetsCustomerUpdateDto } from 'src/excel-products/dto/sheetCustomerUpdate.dto';
import { SheetsCustomerDto } from 'src/excel-products/dto/sheetCustomer.dto';

@Injectable()
export class CustomersService {
  constructor(
    @InjectModel(Customer)
    private readonly customerModel: typeof Customer,
  ) { }

  // Listar clientes paginados
  async findAllPaginated(
    options: any,
    limit: number,
    offset: number,
    orderBy: string = 'createdAt',
    order: 'ASC' | 'DESC' = 'DESC',
  ) {
    const { rows: data, count: total } = await Customer.findAndCountAll({
      where: options,
      limit,
      offset,
      order: [[orderBy, order]],
      include: [], // agregar relaciones si quieres, ej: orders
    });

    return { data, total };
  }

  // Obtener cliente por ID
  async findOne(tenantId: string, id: string) {

    if (id === 'create') {
      return
    }

    const customer = await Customer.findOne({
      where: { id, tenantId },
      include: ['orders'], // incluir orders si quieres
    });

    if (!customer) throw new NotFoundException(`Customer with ID ${id} not found`);
    return customer;
  }

  // Crear cliente
  async create(tenantId: string, createCustomerDto: CreateCustomerDto) {
    const customer = await Customer.create({
      ...createCustomerDto,
      tenantId,
    });

    return customer;
  }

  // Actualizar cliente
  async update(tenantId: string, id: string, updateCustomerDto: UpdateCustomerDto) {
    const customer = await this.findOne(tenantId, id);

    await customer.update(updateCustomerDto);

    return customer;
  }

  // Eliminar cliente
  async remove(tenantId: string, id: string) {
    const customer = await this.findOne(tenantId, id);

    await customer.destroy();

    return { message: 'Customer deleted successfully' };
  }

  async getExportCustomers(): Promise<Customer[]> {
    return Customer.findAll({ order: [['name', 'ASC']] });
  }

  async exportCustomersToExcel(customers: Customer[]) {
    const workbook = xlsx.utils.book_new();
    const headers = ['ID', 'Nombre', 'Email', 'Teléfono', 'Ciudad', 'País'];
    const data = customers.map(c => [
      c.id,
      c.name ?? '',
      c.email ?? '',
      c.phone ?? '',
      c.city ?? '',
      c.country ?? '',
    ]);

    const worksheet = xlsx.utils.aoa_to_sheet([headers, ...data]);
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Customers');

    const metaSheet = xlsx.utils.aoa_to_sheet([
      ['Fecha de exportación', new Date().toISOString()],
      ['Total de customers', customers.length],
      ['Instrucciones', 'No modifiques el ID si vas a actualizar. Puedes editar nombre, email, teléfono, ciudad y país.'],
    ]);
    xlsx.utils.book_append_sheet(workbook, metaSheet, 'Metadatos');

    return xlsx.write(workbook, { type: 'buffer' });
  }

  async generateExampleCustomerExcel() {
    const workbook = xlsx.utils.book_new();
    const headers = ['Nombre', 'Email', 'Teléfono', 'Ciudad', 'Localidad'];
    const exampleRows = [
      ['Juan Pérez', 'juan@example.com', '+541112345678', 'Buenos Aires', 'Argentina'],
      ['María López', 'maria@example.com', '+541198765432', 'Córdoba', 'Argentina'],
    ];
    const worksheet = xlsx.utils.aoa_to_sheet([headers, ...exampleRows]);
    xlsx.utils.book_append_sheet(workbook, worksheet, 'EjemploCustomers');

    const instructionsSheet = xlsx.utils.aoa_to_sheet([
      ['Instrucciones:'],
      ['1. Rellena todos los campos obligatorios (Nombre, Email).'],
      ['2. Email debe ser único.'],
      ['3. No incluyas ID para nuevas creaciones.'],
      ['4. Ciudad y País son opcionales.'],
    ]);
    xlsx.utils.book_append_sheet(workbook, instructionsSheet, 'Instrucciones');

    return xlsx.write(workbook, { type: 'buffer' });
  }

  async importCustomersFromExcel(tenantId: string, allCustomers: SheetsCustomerDto[]) {
    const transaction = await Customer.sequelize.transaction();

    const report = { successes: [], errors: [] };

    try {
      for (let i = 0; i < allCustomers.length; i++) {
        const rowIndex = i + 2;
        const c = allCustomers[i];

        try {
          await Customer.create(
            {
              name: c.Nombre,
              email: c.Email,
              city: c.Ciudad,
              phone: c.Telefono,
              country: c.Localidad,
              tenantId
            }, // 👈 agregar tenantId siempre
            { transaction }
          );

          report.successes.push({ row: rowIndex, customer: c.Nombre, action: 'created' });
        } catch (err: any) {

          report.errors.push({ row: rowIndex, customer: c.Nombre, error: err.message });
        }
      }

      if (report.errors.length > 0) { throw new HttpException("error", 400) }

      await transaction.commit();
      return { statusCode: 201, message: 'Importación completada', report };
    } catch (err: any) {
      await transaction.rollback();
      return { statusCode: 500, message: 'Importación fallida', report };
    }
  }

  async updateCustomersFromExcel(tenantId: string, allCustomers: SheetsCustomerUpdateDto[]) {

    const sequelize = Customer.sequelize;

    const transaction = await sequelize.transaction();

    const report = { successes: [], errors: [] };

    try {
      for (let i = 0; i < allCustomers.length; i++) {
        const rowIndex = i + 2;
        const c = allCustomers[i];

        if (!c.ID) {
          report.errors.push({ row: rowIndex, customer: c.Nombre, error: 'ID no definido' });
          continue;
        }

        // 👇 Buscar por id y tenantId
        const dbCustomer = await Customer.findOne({
          where: { id: c.ID, tenantId },
          transaction,
        });

        if (!dbCustomer) {
          report.errors.push({ row: rowIndex, customer: c.Nombre, error: `No se encontró ID ${c.ID} para este tenant` });
          continue;
        }

        await dbCustomer.update({
          name: c.Nombre,
          email: c.Email,
          city: c.Ciudad,
          phone: c.Teléfono,
          country: c.Localidad,
          tenantId
        }, { transaction });
        report.successes.push({ row: rowIndex, customer: c.Nombre, action: 'updated' });
      }

      if (report.errors.length > 0) { throw new HttpException("error", 400) }

      await transaction.commit();
      return { statusCode: 200, message: 'Customers actualizados', report };
    } catch (err: any) {
      await transaction.rollback();
      return { statusCode: 500, message: 'Actualización fallida', report };
    }
  }


}
