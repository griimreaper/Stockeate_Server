import { HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Supplier } from './entities/supplier.entity';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import * as xlsx from 'xlsx';
import { SheetsSupplierDto } from '../excel-products/dto/sheetSupplier.dto';
import { SheetsSupplierUpdateDto } from '../excel-products/dto/sheetSupplierUpdate.dto';
import { Purchase } from '../purchases/entities/purchase.entity';
import { PurchaseItem } from '../purchase-items/entities/purchase-item.entity';
import { Product } from '../products/entities/product.entity';
import { literal } from 'sequelize';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectModel(Supplier)
    private readonly supplierModel: typeof Supplier,
  ) { }

  // Listar proveedores paginados
  async findAllPaginated(
    options: any,
    limit: number,
    offset: number,
    orderBy: string = 'createdAt',
    order: 'ASC' | 'DESC' = 'DESC',
  ) {
    let orderClause: any = [];

    if (orderBy === 'purchase') {
      // Ordenar por cantidad de compras (subquery)
      orderClause = [[literal(`(
      SELECT COUNT(*)
      FROM "Purchases" AS purchase
      WHERE purchase."supplier_id" = "Supplier"."id"
    )`), order]];
    } else {
      // Orden normal por columna del Supplier
      orderClause = [[orderBy, order]];
    }

    // Traigo solo los suppliers de la página actual
    const suppliers = await Supplier.findAll({
      where: options,
      include: [
        {
          model: Purchase,
          as: 'purchases',
          include: [
            {
              model: PurchaseItem,
              as: 'items',
            },
          ],
        },
      ],
      limit,
      offset,
      order: orderClause,
    });

    // Total de registros (sin limit/offset)
    const total = await Supplier.count({ where: options });

    return { data: suppliers, total };
  }

  // Obtener proveedor por ID
  async findOne(tenantId: string, id: string) {
    try {
      let supplier;
      // 1️⃣ Buscar el proveedor
      if (id !== "create") {
        supplier = await Supplier.findOne({
          where: { id, tenantId },
        });

        if (!supplier) throw new NotFoundException(`Supplier with ID ${id} not found`);
      }

      // 2️⃣ Traer todos los productos del tenant
      const products = await Product.findAll({
        where: { tenantId },
        attributes: ['name'], // solo lo que necesitamos
      });

      return {
        supplier,
        products, // array de productos existentes
      };
    } catch (error) {
      throw new HttpException(error.message, error.status)
    }
  }

  // Crear proveedor
  async create(
    tenantId: string,
    createSupplierDto: CreateSupplierDto & { products?: { name: string; price: number; quantity: number }[], date?: Date }
  ) {
    const sequelize = Supplier.sequelize; // asumimos que todas las entidades usan la misma instancia

    const { products = [], date, ...supplierData } = createSupplierDto;

    return await sequelize.transaction(async (t) => {
      // 1️⃣ Crear proveedor
      const supplier = await Supplier.create(
        { ...supplierData, tenantId },
        { transaction: t }
      );

      // 2️⃣ Manejar productos y preparar items de compra
      const purchaseItems: { productId: string; price: number; quantity: number }[] = [];

      for (const p of products) {
        const [product, created] = await Product.findOrCreate({
          where: { name: p.name, tenantId },
          defaults: {
            price: p.price,
            stock: p.quantity,
            tenantId,
          },
          transaction: t,
        });

        if (!created) {
          product.stock += p.quantity;
          await product.save({ transaction: t });
        }

        purchaseItems.push({
          productId: product.id,
          price: p.price,
          quantity: p.quantity,
        });
      }

      // 3️⃣ Crear la compra
      const purchase = await Purchase.create(
        {
          supplierId: supplier.id,
          tenantId,
          date: date || new Date(),
        },
        { transaction: t }
      );

      // 4️⃣ Crear items de compra
      for (const item of purchaseItems) {
        await PurchaseItem.create(
          {
            ...item,
            purchaseId: purchase.id,
          },
          { transaction: t }
        );
      }

      return supplier;
    });
  }


  // Actualizar proveedor
  async update(tenantId: string, id: string, updateSupplierDto: UpdateSupplierDto) {
    const { supplier } = await this.findOne(tenantId, id);

    await supplier.update(updateSupplierDto);

    return supplier;
  }

  // Eliminar proveedor
  async remove(tenantId: string, id: string) {
    const { supplier } = await this.findOne(tenantId, id);

    await supplier.destroy();

    return { message: 'Supplier deleted successfully' };
  }

  // Exportar proveedores
  async getExportSuppliers(): Promise<Supplier[]> {
    return Supplier.findAll({ order: [['name', 'ASC']] });
  }

  async exportSuppliersToExcel(suppliers: Supplier[]) {
    const workbook = xlsx.utils.book_new();
    const headers = ['ID', 'Nombre', 'Email', 'Teléfono', 'Ciudad', 'Localidad'];
    const data = suppliers.map((s) => [
      s.id,
      s.name ?? '',
      s.email ?? '',
      s.phone ?? '',
      s.city ?? '',
      s.address ?? '',
    ]);

    const worksheet = xlsx.utils.aoa_to_sheet([headers, ...data]);
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Suppliers');

    const metaSheet = xlsx.utils.aoa_to_sheet([
      ['Fecha de exportación', new Date().toISOString()],
      ['Total de suppliers', suppliers.length],
      ['Instrucciones', 'No modifiques el ID si vas a actualizar. Puedes editar nombre, email, teléfono, ciudad y país.'],
    ]);
    xlsx.utils.book_append_sheet(workbook, metaSheet, 'Metadatos');

    return xlsx.write(workbook, { type: 'buffer' });
  }

  // Ejemplo de excel
  async generateExampleSupplierExcel() {
    const workbook = xlsx.utils.book_new();
    const headers = ['Nombre', 'Email', 'Teléfono', 'Ciudad', 'Localidad'];
    const exampleRows = [
      ['Proveedor A', 'a@example.com', '+541112345678', 'Buenos Aires', 'Argentina'],
      ['Proveedor B', 'b@example.com', '+541198765432', 'Córdoba', 'Argentina'],
    ];
    const worksheet = xlsx.utils.aoa_to_sheet([headers, ...exampleRows]);
    xlsx.utils.book_append_sheet(workbook, worksheet, 'EjemploSuppliers');

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

  // Importar proveedores
  async importSuppliersFromExcel(tenantId: string, allSuppliers: SheetsSupplierDto[]) {
    const transaction = await Supplier.sequelize.transaction();
    const report = { successes: [], errors: [] };

    try {
      for (let i = 0; i < allSuppliers.length; i++) {
        const rowIndex = i + 2;
        const s = allSuppliers[i];

        try {
          await Supplier.create(
            {
              name: s.Nombre,
              email: s.Email,
              city: s.Ciudad,
              phone: s.Teléfono,
              country: s.Localidad,
              tenantId,
            },
            { transaction },
          );

          report.successes.push({ row: rowIndex, supplier: s.Nombre, action: 'created' });
        } catch (err: any) {
          report.errors.push({ row: rowIndex, supplier: s.Nombre, error: err.message });
        }
      }

      if (report.errors.length > 0) throw new HttpException('error', 400);

      await transaction.commit();
      return { statusCode: 201, message: 'Importación completada', report };
    } catch (err: any) {
      await transaction.rollback();
      return { statusCode: 500, message: 'Importación fallida', report };
    }
  }

  // Actualizar proveedores desde excel
  async updateSuppliersFromExcel(tenantId: string, allSuppliers: SheetsSupplierUpdateDto[]) {
    const sequelize = Supplier.sequelize;
    const transaction = await sequelize.transaction();

    const report = { successes: [], errors: [] };

    try {
      for (let i = 0; i < allSuppliers.length; i++) {
        const rowIndex = i + 2;
        const s = allSuppliers[i];

        if (!s.ID) {
          report.errors.push({ row: rowIndex, supplier: s.Nombre, error: 'ID no definido' });
          continue;
        }

        const dbSupplier = await Supplier.findOne({
          where: { id: s.ID, tenantId },
          transaction,
        });

        if (!dbSupplier) {
          report.errors.push({
            row: rowIndex,
            supplier: s.Nombre,
            error: `No se encontró ID ${s.ID} para este tenant`,
          });
          continue;
        }

        await dbSupplier.update(
          {
            name: s.Nombre,
            email: s.Email,
            city: s.Ciudad,
            phone: s.Teléfono,
            country: s.Localidad,
            tenantId,
          },
          { transaction },
        );

        report.successes.push({ row: rowIndex, supplier: s.Nombre, action: 'updated' });
      }

      if (report.errors.length > 0) throw new HttpException('error', 400);

      await transaction.commit();
      return { statusCode: 200, message: 'Suppliers actualizados', report };
    } catch (err: any) {
      await transaction.rollback();
      return { statusCode: 500, message: 'Actualización fallida', report };
    }
  }
}
