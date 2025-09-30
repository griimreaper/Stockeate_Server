import { BadRequestException, HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Purchase } from '../purchases/entities/purchase.entity';
import { PurchaseItem } from '../purchase-items/entities/purchase-item.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { Product } from '../products/entities/product.entity';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';
import * as xlsx from 'xlsx';
import { User } from '../users/entities/user.entity';
import { SheetsPurchaseDto } from '../excel-products/dto/sheetPurchase.dto';

@Injectable()
export class PurchasesService {
  constructor(
    @InjectModel(Purchase) private readonly purchaseModel: typeof Purchase,
    @InjectModel(PurchaseItem) private readonly purchaseItemModel: typeof PurchaseItem,
    @InjectModel(Supplier) private readonly supplierModel: typeof Supplier,
    @InjectModel(Product) private readonly productModel: typeof Product,
  ) { }

  // Listar compras con paginación y filtros
  async findAllPaginated(
    options: any,
    limit: number,
    offset: number,
    orderBy: string = 'date',
    order: 'ASC' | 'DESC' = 'DESC',
  ) {
    const total = await Purchase.count({ where: options });

    const rows = await Purchase.findAll({
      where: options,
      include: [
        { model: Supplier, as: 'supplier', attributes: ['name'] },
        {
          model: PurchaseItem,
          as: 'items',
          include: [{ model: Product, as: 'product' }],
        },
      ],
    });

    const plainPurchases = rows.map(p => p.toJSON());

    const sorted = plainPurchases.sort((a, b) => {
      if (orderBy === 'supplier') {
        const nameA = a.supplier?.name || '';
        const nameB = b.supplier?.name || '';
        return order === 'DESC' ? nameB.localeCompare(nameA) : nameA.localeCompare(nameB);
      } else if (orderBy === 'total') {
        const valA = a.total || 0;
        const valB = b.total || 0;
        return order === 'DESC' ? valB - valA : valA - valB;
      } else {
        const valA = a[orderBy];
        const valB = b[orderBy];
        if (valA > valB) return order === 'DESC' ? -1 : 1;
        if (valA < valB) return order === 'DESC' ? 1 : -1;
        return 0;
      }
    });

    const paginated = sorted.slice(offset, offset + limit);

    return { data: paginated, total };
  }

  // Obtener compra por ID junto con proveedores y productos
  async findOne(tenantId: string, id: string) {
    let purchase;

    if (id !== 'create') {
      purchase = await Purchase.findOne({
        where: { id, tenantId },
        include: [
          {
            model: Supplier,
            attributes: ['id', 'name', 'email', 'phone'],
          },
          {
            model: PurchaseItem,
            include: [{ model: Product, attributes: ['id', 'name', 'price'] }],
          },
        ],
      });

      if (!purchase) throw new NotFoundException(`Purchase with ID ${id} not found`);
    }

    const suppliers = await Supplier.findAll({
      where: { tenantId },
      attributes: ['name'],
    });

    const products = await Product.findAll({
      where: { tenantId },
      attributes: ['id', 'name', 'price', 'stock'],
    });

    return { purchase, suppliers, products };
  }

  // Crear compra
  async create(tenantId: string, userId: string, payload: CreatePurchaseDto) {
    const transaction = await Purchase.sequelize.transaction();

    try {
      // Resolver o crear supplier
      let supplierId: string;
      let supplierName: string;

      if (typeof payload.supplier === 'string') {
        supplierName = payload.supplier;
      } else if (payload.supplier && payload.supplier.name) {
        supplierName = payload.supplier.name;
      } else {
        throw new BadRequestException('Se requiere un nombre de proveedor válido');
      }

      const [foundSupplier, created] = await Supplier.findOrCreate({
        where: { name: supplierName, tenantId },
        defaults: {
          tenantId,
          name: supplierName,
          email: `${supplierName.toLowerCase().replace(/\s+/g, '')}@ejemplo.com`,
          phone: null,
          city: null,
        },
        transaction,
      });
      supplierId = foundSupplier.id;

      // Preparar items, crear o actualizar productos y calcular total
      let calculatedTotal = 0;
      const newItems = [];
      if (payload.items && payload.items.length) {
        for (const item of payload.items) {
          if (!item.name) {
            throw new BadRequestException('Se requiere un nombre de producto');
          }

          const [foundProduct, created] = await Product.findOrCreate({
            where: { name: item.name, tenantId },
            defaults: {
              tenantId,
              name: item.name,
              price: item.price || 0,
              stock: item.quantity || 0,
              description: '',
            },
            transaction,
          });

          if (!created) {
            await foundProduct.update(
              { stock: foundProduct.stock + (item.quantity || 0) },
              { transaction },
            );
          }

          newItems.push({
            productId: foundProduct.id,
            quantity: item.quantity || 0,
            price: item.price || 0,
            purchaseId: null,
          });
          calculatedTotal += (item.quantity || 0) * (item.price || 0);
        }
      }

      // Crear la compra
      const purchasePayload = {
        tenantId,
        supplierId,
        userId,
        date: payload.date ? new Date(payload.date) : new Date(),
        total: calculatedTotal,
      };
      const purchase = await Purchase.create(purchasePayload, { transaction });

      // Crear los items
      if (newItems.length) {
        const itemsToCreate = newItems.map((item) => ({
          ...item,
          purchaseId: purchase.id,
        }));
        await PurchaseItem.bulkCreate(itemsToCreate, { transaction });
      }

      await transaction.commit();
      const createdPurchase = await this.findOne(tenantId, purchase.id);
      return createdPurchase;
    } catch (err: any) {
      await transaction.rollback();
      throw err;
    }
  }

  // Actualizar compra
  async update(tenantId: string, id: string, payload: UpdatePurchaseDto) {
    const transaction = await Purchase.sequelize.transaction();

    try {
      const purchase = await Purchase.findOne({ where: { id, tenantId }, transaction });
      if (!purchase) {
        throw new NotFoundException('Purchase not found');
      }

      // Separar items y manejar supplier/supplierId lógicamente
      const { items, supplier, ...purchasePayload } = payload;

      let finalSupplierId = purchase.supplierId;
      if (supplier && supplier.name) {
        const [foundSupplier, created] = await Supplier.findOrCreate({
          where: { name: supplier.name, tenantId },
          defaults: {
            tenantId,
            name: supplier.name,
            email: supplier.email || `${supplier.name.toLowerCase().replace(/\s+/g, '')}@ejemplo.com`,
            phone: supplier.phone || null,
            city: null,
          },
          transaction,
        });
        finalSupplierId = foundSupplier.id;
      }

      // Actualizar compra con supplierId resuelto
      await purchase.update({ ...purchasePayload, supplierId: finalSupplierId }, { transaction });

      // Procesar items
      let calculatedTotal = purchase.total;

      if (items) {
        const currentItems = await PurchaseItem.findAll({ where: { purchaseId: id }, transaction });
        for (const currentItem of currentItems) {
          const product = await Product.findOne({ where: { id: currentItem.productId, tenantId }, transaction });
          if (product) {
            await product.update({ stock: product.stock - currentItem.quantity }, { transaction });
          }
        }
        await PurchaseItem.destroy({ where: { purchaseId: id }, transaction });

        const newItems = [];
        for (const item of items) {
          let finalProductId = item.productId;
          if (!finalProductId && item.name) {
            const [foundProduct, created] = await Product.findOrCreate({
              where: { name: item.name, tenantId },
              defaults: {
                tenantId,
                name: item.name,
                price: item.price || 0,
                stock: item.quantity || 0,
                description: '',
              },
              transaction,
            });
            finalProductId = foundProduct.id;
            if (!created) {
              await foundProduct.update(
                { stock: foundProduct.stock + (item.quantity || 0) },
                { transaction },
              );
            }
          } else if (finalProductId) {
            const product = await Product.findOne({ where: { id: finalProductId, tenantId }, transaction });
            if (!product) {
              throw new NotFoundException(`Producto con ID ${finalProductId} no encontrado`);
            }
            await product.update(
              { stock: product.stock + (item.quantity || 0) },
              { transaction },
            );
          } else {
            throw new BadRequestException('Se requiere un productId válido o un nombre de producto');
          }

          newItems.push({
            purchaseId: id,
            productId: finalProductId,
            quantity: item.quantity || 0,
            price: item.price || 0,
          });
        }

        if (newItems.length) {
          await PurchaseItem.bulkCreate(newItems, { transaction });
        }

        calculatedTotal = newItems.reduce(
          (sum, item) => sum + (item.quantity || 0) * (item.price || 0),
          0,
        );
      }

      if (calculatedTotal !== purchase.total) {
        await purchase.update({ total: calculatedTotal }, { transaction });
      }

      await transaction.commit();
      const updatedPurchase = await this.findOne(tenantId, id);
      return updatedPurchase;
    } catch (err: any) {
      await transaction.rollback();
      throw err;
    }
  }

  // Eliminar compra
  async remove(tenantId: string, id: string) {
    const purchase = await Purchase.findOne({ where: { id, tenantId } });
    if (!purchase) throw new NotFoundException('Purchase not found');

    await PurchaseItem.destroy({ where: { purchaseId: id } });
    await purchase.destroy();

    return { success: true };
  }

  // Exportar compras
  async getExportPurchases(): Promise<Purchase[]> {
    return Purchase.findAll({
      include: [
        {
          model: Supplier,
          as: 'supplier',
          attributes: ['name'],
        },
        {
          model: PurchaseItem,
          as: 'items',
          include: [
            {
              model: Product,
              as: 'product',
              attributes: ['name'],
            },
          ],
        },
      ],
      order: [['date', 'DESC']],
    });
  }

  async exportPurchasesToExcel(purchases: Purchase[]) {
    const workbook = xlsx.utils.book_new();
    const headers = [
      'ID',
      'Proveedor',
      'Fecha',
      'Productos',
      'Cantidades',
      'Precios',
    ];

    const data = purchases.map((p) => {
      const productos = p.items?.map((i) => i.product?.name).join(', ') || '';
      const cantidades = p.items?.map((i) => i.quantity).join(', ') || '';
      const precios = p.items?.map((i) => i.price).join(', ') || '';

      return [
        p.id,
        p.supplier?.name ?? '',
        p.date ? p.date.toISOString().slice(0, 10) : '',
        productos,
        cantidades,
        precios,
      ];
    });

    const worksheet = xlsx.utils.aoa_to_sheet([headers, ...data]);
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Purchases');

    const metaSheet = xlsx.utils.aoa_to_sheet([
      ['Fecha de exportación', new Date().toISOString()],
      ['Total de compras', purchases.length],
      ['Instrucciones', SheetsPurchaseDto.getDescription()],
    ]);
    xlsx.utils.book_append_sheet(workbook, metaSheet, 'Metadatos');

    const suppliers = await Supplier.findAll({ attributes: ['id', 'name'] })

    const suppliersSheet = xlsx.utils.aoa_to_sheet([
      ['ID', 'Nombre'],
      ...suppliers.map(s => [s.id, s.name]),
    ]);
    xlsx.utils.book_append_sheet(workbook, suppliersSheet, 'Suppliers');

    const productos = await Product.findAll();

    const productosSheet = xlsx.utils.aoa_to_sheet([
      ['ID', 'Nombre'],
      ...productos.map(p => [p.id, p.name]),
    ]);
    xlsx.utils.book_append_sheet(workbook, productosSheet, 'Productos');

    return xlsx.write(workbook, { type: 'buffer' });
  }

  // Generar plantilla de ejemplo para compras
  async generateExamplePurchaseExcel() {
    const workbook = xlsx.utils.book_new();
    const headers = [
      'Proveedor',
      'Fecha',
      'Productos',
      'Cantidades',
      'Precios',
    ];

    const suppliers = await Supplier.findAll({ attributes: ['id', 'name'] });
    const products = await Product.findAll({ attributes: ['id', 'name', 'price', 'stock'] });

    const exampleRows = [
      [
        'Proveedor 1',
        '2025-09-15',
        `Producto A, Producto B`,
        '2, 1',
        `50, 50`,
      ],
      [
        'Proveedor 2',
        '2025-09-10',
        `Producto C, Producto D`,
        '1, 1',
        `20, 130`,
      ],
    ];

    const worksheet = xlsx.utils.aoa_to_sheet([headers, ...exampleRows]);
    xlsx.utils.book_append_sheet(workbook, worksheet, 'EjemploPurchases');

    const instructionsSheet = xlsx.utils.aoa_to_sheet([
      ['Instrucciones:'],
      ['1. ID solo se usa en actualizaciones.'],
      ['2. Proveedores y usuarios se crearán si no existen en el sistema.'],
      ['3. Los productos se crearán si no existen, o se actualizarán sumando la cantidad al stock. ' +
        'Cantidades y Precios deben estar alineados por índice.'],
      ['4. Ver las hojas "Suppliers" y "Productos" para referencias de nombres válidos.'],
    ]);
    xlsx.utils.book_append_sheet(workbook, instructionsSheet, 'Instrucciones');

    const suppliersSheetData = suppliers.map(s => [s.id, s.name]);
    const suppliersSheet = xlsx.utils.aoa_to_sheet([
      ['ID', 'Nombre'],
      ...suppliersSheetData,
    ]);
    xlsx.utils.book_append_sheet(workbook, suppliersSheet, 'Suppliers');

    const productsSheetData = products.map(p => [p.id, p.name, p.price, p.stock]);
    const productsSheet = xlsx.utils.aoa_to_sheet([
      ['ID', 'Nombre', 'Precio', 'Stock'],
      ...productsSheetData,
    ]);
    xlsx.utils.book_append_sheet(workbook, productsSheet, 'Productos');

    return xlsx.write(workbook, { type: 'buffer' });
  }

  // Importar compras desde Excel
  async importPurchasesFromExcel(
    tenantId: string,
    allPurchases: SheetsPurchaseDto[],
  ) {
    const transaction = await Purchase.sequelize.transaction();
    const report = { successes: [], errors: [] };

    try {
      for (let i = 0; i < allPurchases.length; i++) {
        const rowIndex = i + 2;
        const p = allPurchases[i];

        try {
          // Crear o buscar proveedor
          const [supplier, createdSupplier] = await Supplier.findOrCreate({
            where: { name: p.Proveedor, tenantId },
            defaults: {
              tenantId,
              name: p.Proveedor,
              email: `${p.Proveedor.toLowerCase().replace(/\s+/g, '')}@ejemplo.com`,
              phone: null,
              city: null,
            },
            transaction,
          });

          let calculatedTotal = 0;
          let nombres: string[] = [];
          let cantidades: number[] = [];
          let precios: number[] = [];

          if (p.Productos) {
            nombres = p.Productos.split(',').map((x) => x.trim());
            cantidades = p.Cantidades
              ? p.Cantidades.split(',').map((x) => Number(x.trim()))
              : nombres.map(() => 1);
            precios = p.Precios
              ? p.Precios.split(',').map((x) => Number(x.trim()))
              : nombres.map(() => 0);

            for (let idx = 0; idx < nombres.length; idx++) {
              const qty = cantidades[idx] || 1;
              const price = precios[idx] || 0;
              calculatedTotal += qty * price;
            }
          }

          // Crear compra
          const purchase = await Purchase.create(
            {
              tenantId,
              supplierId: supplier.id,
              date: new Date(p.Fecha),
              total: calculatedTotal,
            },
            { transaction },
          );

          // Asociar productos y crear o aumentar stock
          for (let idx = 0; idx < nombres.length; idx++) {
            const [product, createdProduct] = await Product.findOrCreate({
              where: { name: nombres[idx], tenantId },
              defaults: {
                tenantId,
                name: nombres[idx],
                price: precios[idx] || 0,
                stock: cantidades[idx] || 1,
                description: '',
              },
              transaction,
            });

            if (!createdProduct) {
              await product.update(
                { stock: product.stock + (cantidades[idx] || 1) },
                { transaction },
              );
            }

            await PurchaseItem.create(
              {
                purchaseId: purchase.id,
                productId: product.id,
                quantity: cantidades[idx] || 1,
                price: precios[idx] || 0,
              },
              { transaction },
            );
          }

          report.successes.push({
            row: rowIndex,
            purchase: purchase.id,
            action: 'created',
          });
        } catch (err: any) {
          report.errors.push({
            row: rowIndex,
            purchase: i,
            error: err.message,
          });
        }
      }

      if (report.errors.length > 0) {
        throw new HttpException('Errores en la importación de algunas compras', 400);
      }

      await transaction.commit();
      return { statusCode: 201, message: 'Importación completada', report };
    } catch (err: any) {
      await transaction.rollback();
      return { statusCode: 500, message: 'Importación fallida', report };
    }
  }

  async updatePurchasesFromExcel(
    tenantId: string,
    allPurchases: SheetsPurchaseDto[],
  ) {
    const transaction = await Purchase.sequelize.transaction();
    const report = { successes: [], errors: [] };

    try {
      for (let i = 0; i < allPurchases.length; i++) {
        const rowIndex = i + 2;
        const p = allPurchases[i];


        if (!p.ID) {

          report.errors.push({
            row: rowIndex,
            error: 'ID no definido',
          });
          continue;
        }

        const dbPurchase = await Purchase.findOne({
          where: { id: p.ID, tenantId },
          include: [{ model: PurchaseItem, as: 'items' }],
          transaction,
        });


        if (!dbPurchase) {

          report.errors.push({
            row: rowIndex,
            error: `No se encontró ID ${p.ID} para este tenant`,
          });
          continue;
        }

        // Crear o buscar proveedor

        const [supplier, createdSupplier] = await Supplier.findOrCreate({
          where: { name: p.Proveedor, tenantId },
          defaults: {
            tenantId,
            name: p.Proveedor,
            email: `${p.Proveedor.toLowerCase().replace(/\s+/g, '')}@ejemplo.com`,
            phone: null,
            city: null,
          },
          transaction,
        });


        let calculatedTotal = 0;
        let nombres: string[] = [];
        let cantidades: number[] = [];
        let precios: number[] = [];

        if (p.Productos) {
          nombres = p.Productos.split(',').map((x) => x.trim());
          cantidades = p.Cantidades
            ? p.Cantidades.split(',').map((x) => Number(x.trim()))
            : nombres.map(() => 1);
          precios = p.Precios
            ? p.Precios.split(',').map((x) => Number(x.trim()))
            : nombres.map(() => 0);


          for (let idx = 0; idx < nombres.length; idx++) {
            const qty = cantidades[idx] || 1;
            const price = precios[idx] || 0;
            calculatedTotal += qty * price;
          }

        }

        // Revertir stock de items actuales
        const currentItems = await PurchaseItem.findAll({ where: { purchaseId: dbPurchase.id }, transaction });

        for (const currentItem of currentItems) {
          const product = await Product.findOne({ where: { id: currentItem.productId, tenantId }, transaction });
          if (product) {
            await product.update({ stock: product.stock - currentItem.quantity }, { transaction });
          }
        }


        await PurchaseItem.destroy({ where: { purchaseId: dbPurchase.id }, transaction });

        // Actualizar compra

        await dbPurchase.update(
          {
            supplierId: supplier.id,
            date: new Date(p.Fecha),
            total: calculatedTotal,
          },
          { transaction },
        );

        // Crear o actualizar productos y asociar items
        for (let idx = 0; idx < nombres.length; idx++) {
          if (!nombres[idx]) {

            report.errors.push({
              row: rowIndex,
              purchase: i,
              error: `Nombre de producto requerido en el índice ${idx}`,
            });
            continue;
          }


          const [product, createdProduct] = await Product.findOrCreate({
            where: { name: nombres[idx], tenantId },
            defaults: {
              tenantId,
              name: nombres[idx],
              price: precios[idx] || 0,
              stock: cantidades[idx] || 1,
              description: '',
            },
            transaction,
          });


          if (!createdProduct) {
            const newStock = product.stock + (cantidades[idx] || 1);

            await product.update(
              { stock: newStock },
              { transaction },
            );
          }


          await PurchaseItem.create(
            {
              purchaseId: dbPurchase.id,
              productId: product.id,
              quantity: cantidades[idx] || 1,
              price: precios[idx] || 0,
            },
            { transaction },
          );
        }


        report.successes.push({
          row: rowIndex,
          purchase: dbPurchase.id,
          action: 'updated',
        });
      }

      if (report.errors.length > 0) {

        throw new HttpException('error', 400);
      }


      await transaction.commit();

      return { statusCode: 200, message: 'Compras actualizadas', report };
    } catch (err: any) {
      await transaction.rollback();

      return { statusCode: 500, message: 'Actualización fallida', report };
    }
  }
}