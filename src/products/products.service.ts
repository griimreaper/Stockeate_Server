import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product, ProductStatus } from './entities/product.entity';
import { col, fn, Op, Order } from 'sequelize';
import { Category } from 'src/categories/entities/category.entity';
import * as xlsx from "xlsx";
import { SheetsProductsDto } from 'src/excel-products/dto/sheetProduct.dto';
import { PurchaseItem } from 'src/purchase-items/entities/purchase-item.entity';
import { Purchase } from 'src/purchases/entities/purchase.entity';
import { Supplier } from 'src/suppliers/entities/supplier.entity';
import { CategoriesService } from 'src/categories/categories.service';
import { VercelBlobService } from 'src/files/vercel-storage.service';
import axios from 'axios';
import { OrderItem } from 'src/order-items/entities/order-item.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product)
    private readonly productModel: typeof Product,
    @InjectModel(Category)
    private readonly categoryModel: typeof Category, // 👈 inyectado
    @InjectModel(Purchase)
    private readonly purchaseModel: typeof Purchase, // 👈 inyectado
    @InjectModel(PurchaseItem)
    private readonly purchaseItemModel: typeof PurchaseItem, // 👈 inyectado
    @InjectModel(Supplier)
    private readonly supplierModel: typeof Supplier, // 👈 inyectado
    private readonly categoriesService: CategoriesService,
    private readonly vercelBlobService: VercelBlobService,
  ) { }

  async create(
    tenantId: string,
    createProductDto: CreateProductDto,
  ): Promise<Product> {
    const { categories = [], ...productData } = createProductDto;

    // Crear producto
    const product = await Product.create({
      ...productData,
      tenantId,
    });

    // Lista final de instancias de categorías
    const finalCategories: Category[] = [];

    // Manejar `categories` (pueden venir con `id` o `name`)
    for (const c of categories) {
      if (c.id) {
        const category = await Category.findOne({
          where: { id: c.id, tenantId },
        });
        if (category) {
          finalCategories.push(category);
        }
      } else if (c.name) {
        const [category, created] = await Category.findOrCreate({
          where: { name: c.name.trim(), tenantId },
          defaults: { name: c.name.trim(), tenantId },
        });
        finalCategories.push(category);

      }
    }

    // Asociar categorías al producto
    if (finalCategories.length > 0) {
      await product.$set('categories', finalCategories);
    } else {
    }

    // Retornar con categorías incluidas
    const productWithCats = await Product.findByPk(product.id, {
      include: [Category],
    });


    return productWithCats ?? product;
  }


  async findAllPaginated(
    filters: any,
    limit: number,
    offset: number,
    category?: string,
    orderBy?: string,
    order?: "ASC" | "DESC",
  ): Promise<{ data: Product[]; total: number; categories: string[] }> {
    let orderArray: Order | undefined = undefined;
    if (orderBy && order) {
      orderArray = [[orderBy, order]] as Order;
    }

    const includeCategory: any = {
      model: Category,
      as: "categories", // 👈 relación many-to-many
      attributes: ["id", "name"],
      through: { attributes: [] }, // omitimos tabla intermedia
    };

    if (category) {
      includeCategory.where = { name: { [Op.iLike]: category } };
      includeCategory.required = true; // INNER JOIN
    }

    const { rows, count } = await Product.findAndCountAll({
      where: filters,
      limit,
      offset,
      order: orderArray,
      include: [
        includeCategory,
        {
          model: OrderItem,
          required: false, // LEFT JOIN (si no hay ventas, igual devuelve el producto)
          attributes: ['quantity', 'price'],
        },
        {
          model: PurchaseItem,
          required: false, // LEFT JOIN (si no hay compras, igual devuelve el producto)
          attributes: ['quantity', 'price'],
        }
      ],
      distinct: true,
    });

    // Obtener solo nombres de categorías distintas
    const categories = await Category.findAll({
      attributes: ["name"],
      raw: true,
    });
    const categoryNames = [...new Set(categories.map(c => c.name))];

    return { data: rows, total: count, categories: categoryNames };
  }


  // product.service.ts
  async findOne(tenantId: string, idOrCreate: string) {
    let product;

    if (idOrCreate !== 'create') {
      product = await Product.findByPk(idOrCreate, {
        include: [
          {
            model: Category,
            as: 'categories', // many-to-many
            attributes: ['id', 'name'],
            through: { attributes: [] },
          },
        ],
      });
    }

    const categories = await Category.findAll({
      where: { tenantId },
      attributes: ['id', 'name'],
    });

    return { product, categoriesList: categories };
  }

  async update(
    tenantId: string,
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<Product> {

    const result = await this.findOne(tenantId, id);

    if (!('product' in result) || !result.product) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }

    const product = result.product;

    const { categories = [], ...productData } = updateProductDto;

    // Actualizar datos del producto
    await product.update({ ...productData });

    // Procesar categorías
    const finalCategories: Category[] = [];

    for (const c of categories) {
      if (c.id) {
        const category = await Category.findOne({
          where: { id: c.id, tenantId },
        });
        if (category) {
          finalCategories.push(category);
        }
      } else if (c.name) {
        const [category, created] = await Category.findOrCreate({
          where: { name: c.name.trim(), tenantId },
          defaults: { name: c.name.trim(), tenantId },
        });
        finalCategories.push(category);

      }
    }

    // Asociar categorías (si hay)
    if (finalCategories.length > 0) {
      await product.$set('categories', finalCategories);
    } else {
    }

    // Retornar con categorías incluidas
    const productWithCats = await Product.findByPk(product.id, {
      include: [Category],
    });


    return productWithCats ?? product;
  }


  async remove(tenantId: string, id: string): Promise<{ message: string }> {
    const product = await Product.findOne({
      where: { id, tenantId },
    });

    if (!product) {
      throw new NotFoundException(`Product with id ${id} not found for this tenant`);
    }

    await product.destroy();
    return { message: 'Product removed successfully' };
  }

  async importProductsFromExcel(
    tenantId: string,
    allProducts: SheetsProductsDto[],
  ) {
    const sequelize = Product.sequelize;
    const DEFAULT_SUPPLIER_NAME = 'Proveedor - Sin nombre';
    const vercelService = new VercelBlobService();

    const report = {
      successes: [] as Array<{
        row: number;
        product: string;
        supplier: string;
        action: 'created' | 'updated';
      }>,
      errors: [] as Array<{
        row?: number;
        product?: string;
        supplier?: string;
        error: string;
      }>,
    };

    const transaction = await sequelize.transaction();
    try {
      // Productos existentes
      const existingProducts: Product[] = await Product.findAll({
        where: { tenantId },
        include: [Category],
        transaction,
      });
      const productMap = new Map(
        existingProducts.map(p => [(p.name || '').trim().toLowerCase(), p]),
      );

      const categoryCache = new Map<string, Category>();
      const supplierCache = new Map<string, Supplier>();

      // Agrupamos por proveedor
      const productsBySupplier = allProducts.reduce((acc, product) => {
        const supplierName = (product.Proveedor || DEFAULT_SUPPLIER_NAME).trim();
        const key = supplierName.toLowerCase();
        if (!acc[key]) acc[key] = { supplierName, items: [] as SheetsProductsDto[] };
        acc[key].items.push(product);
        return acc;
      }, {} as Record<string, { supplierName: string; items: SheetsProductsDto[] }>);

      for (const { supplierName, items } of Object.values(productsBySupplier)) {
        // Proveedor
        const supplierKey = supplierName.toLowerCase();
        let supplier = supplierCache.get(supplierKey);
        if (!supplier) {
          const [sup] = await Supplier.findOrCreate({
            where: { name: supplierName, tenantId },
            defaults: { name: supplierName, tenantId },
            transaction,
          });
          supplier = sup;
          supplierCache.set(supplierKey, supplier);
        }

        // Crear compra
        const purchase = await Purchase.create(
          { supplierId: supplier.id, tenantId, date: new Date(), total: 0 },
          { transaction },
        );
        const purchaseItemsData: any[] = [];
        let totalCompra = 0;

        for (const excelProduct of items) {
          const prodName = (excelProduct.Nombre || '').trim();
          const prodNameKey = prodName.toLowerCase();
          const cantidad = Number(excelProduct.Stock) || 0;
          const precioCompra = Number(excelProduct.PrecioCompra) || 0;
          const precioVenta = Number(excelProduct.PrecioVenta) || 0;

          // 🔎 Subida de imagen si existe
          let imageUrl: string | null = null;
          if (excelProduct.Imagen) {
            try {
              const response = await axios.get<ArrayBuffer>(excelProduct.Imagen, { responseType: 'arraybuffer' });
              const buffer = Buffer.from(response.data);

              imageUrl = await vercelService.uploadBuffer(
                buffer,
                `products/${excelProduct.Nombre?.trim()}`,
                `${prodName}.jpg`
              );

            } catch (err: any) {
              console.error('Error subiendo imagen:', err);
              report.errors.push({
                row: -1,
                product: prodName,
                supplier: supplierName,
                error: `Error subiendo imagen: ${err.message || err}`,
              });
            }
          }

          // 🔎 Categorías como instancias
          const categoriesRaw = (excelProduct.Categorias || '')
            .split(',')
            .map(c => c.trim())
            .filter(Boolean);
          const categoryInstances: Category[] = [];

          for (const catName of categoriesRaw.length ? categoriesRaw : ['Sin categoría']) {
            const key = catName.toLowerCase();
            let category = categoryCache.get(key);
            if (!category) {
              const [cat] = await Category.findOrCreate({
                where: { name: catName, tenantId },
                defaults: { name: catName, tenantId },
                transaction,
              });
              category = cat;
              categoryCache.set(key, category);
            }
            categoryInstances.push(category);
          }

          // Producto
          let dbProduct = productMap.get(prodNameKey);
          const payloadBase = {
            name: prodName,
            description: excelProduct.Descripcion ?? '',
            price: precioVenta,
            sku: excelProduct.SKU ?? null,
            status: excelProduct.Estado ?? ProductStatus.ACTIVE,
            tenantId,
            URL: imageUrl,
          };

          if (dbProduct) {
            const newStock = Number(dbProduct.stock || 0) + cantidad;
            await dbProduct.update(
              { ...payloadBase, stock: newStock },
              { transaction },
            );
            report.successes.push({
              row: -1,
              product: prodName,
              supplier: supplierName,
              action: 'updated',
            });
          } else {
            dbProduct = await Product.create(
              { ...payloadBase, stock: cantidad },
              { transaction },
            );
            productMap.set(prodNameKey, dbProduct);
            report.successes.push({
              row: -1,
              product: prodName,
              supplier: supplierName,
              action: 'created',
            });
          }

          // Asociar categorías
          if (categoryInstances.length > 0) {
            await dbProduct.$set('categories', categoryInstances, { transaction });
          }

          // Items de compra
          if (cantidad > 0) {
            purchaseItemsData.push({
              purchaseId: purchase.id,
              productId: dbProduct.id,
              quantity: cantidad,
              price: precioCompra,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            totalCompra += cantidad * precioCompra;
          }
        }

        if (purchaseItemsData.length > 0) {
          await PurchaseItem.bulkCreate(purchaseItemsData, { transaction });
        }
        await purchase.update({ total: totalCompra }, { transaction });
      }

      await transaction.commit();

      return {
        statusCode: 201,
        message: 'Importación completada con éxito.',
        report: {
          totalRows: allProducts.length,
          successCount: report.successes.length,
          errorCount: report.errors.length,
          successes: report.successes,
          errors: report.errors,
        },
      };
    } catch (err: any) {
      await transaction.rollback();
      report.errors.push({ row: -1, error: err.message || String(err) });
      return {
        statusCode: 500,
        message: 'Importación fallida. Todo fue revertido.',
        report: {
          totalRows: allProducts.length,
          successCount: report.successes.length,
          errorCount: report.errors.length,
          successes: report.successes,
          errors: report.errors,
        },
      };
    }
  }


  async updateProductsFromExcel(
    tenantId: string,
    allProducts: SheetsProductsDto[],
  ) {
    const sequelize = Product.sequelize;
    const report = {
      successes: [] as Array<{ row: number; product: string; action: 'updated' }>,
      errors: [] as Array<{ row: number; product?: string; id?: string; error: string }>,
    };

    const transaction = await sequelize.transaction();
    const vercelService = new VercelBlobService();
    try {
      for (let i = 0; i < allProducts.length; i++) {
        const rowIndex = i + 2;
        const excelProduct = allProducts[i];

        if (!excelProduct.ID) {
          report.errors.push({
            row: rowIndex,
            product: excelProduct.Nombre,
            error: 'El producto no tiene un ID válido en el Excel.',
          });
          continue;
        }

        const dbProduct = await Product.findOne({
          where: { id: excelProduct.ID, tenantId },
          include: [Category],
          transaction,
        });

        if (!dbProduct) {
          report.errors.push({
            row: rowIndex,
            product: excelProduct.Nombre,
            id: excelProduct.ID,
            error: `No se encontró un producto con ID ${excelProduct.ID}.`,
          });
          continue;
        }

        // 🔎 Manejo de categorías
        const categoryInstances: Category[] = [];
        if (excelProduct.Categorias) {
          const categoryNames = excelProduct.Categorias.split(',')
            .map(c => c.trim())
            .filter(Boolean);

          for (const name of categoryNames) {
            const [category] = await Category.findOrCreate({
              where: { name, tenantId },
              defaults: { name, tenantId },
              transaction,
            });
            categoryInstances.push(category);
          }
        }

        // 🔎 Preparar payload
        const payload: Partial<Product> = {
          name: excelProduct.Nombre?.trim() ?? dbProduct.name,
          description: excelProduct.Descripcion ?? dbProduct.description,
          price: excelProduct.PrecioVenta ?? dbProduct.price,
          stock: excelProduct.Stock ?? dbProduct.stock,
          sku: excelProduct.SKU ?? dbProduct.sku,
          status: excelProduct.Estado ?? dbProduct.status,
        };

        // 🔎 Subida de imagen si existe
        if (excelProduct.Imagen) {
          try {
            const response = await axios.get<ArrayBuffer>(excelProduct.Imagen, { responseType: 'arraybuffer' });
            const buffer = Buffer.from(response.data);

            const filename = `${excelProduct.Nombre?.trim() || dbProduct.id}.jpg`;
            const imageUrl = await vercelService.uploadBuffer(
              buffer,
              `products/${excelProduct.Nombre?.trim() || dbProduct.id}`,
              filename
            );

            payload.URL = imageUrl;
          } catch (err: any) {
            report.errors.push({
              row: rowIndex,
              product: excelProduct.Nombre,
              id: excelProduct.ID,
              error: `Error subiendo imagen: ${err.message || err}`,
            });
          }
        }

        // Actualizar producto
        await dbProduct.update(payload, { transaction });

        // Actualizar categorías
        if (categoryInstances.length > 0) {
          await dbProduct.$set('categories', categoryInstances, { transaction });
        }

        report.successes.push({
          row: rowIndex,
          product: dbProduct.name,
          action: 'updated',
        });
      }

      await this.categoriesService.cleanupUnusedCategories(tenantId, transaction);
      await transaction.commit();

      return {
        statusCode: 200,
        message: 'Productos actualizados correctamente.',
        report: {
          totalRows: allProducts.length,
          successCount: report.successes.length,
          errorCount: report.errors.length,
          successes: report.successes,
          errors: report.errors,
        },
      };
    } catch (err: any) {
      await transaction.rollback();
      report.errors.push({ row: -1, error: err.message || String(err) });
      return {
        statusCode: 500,
        message: 'Actualización fallida. Todo revertido.',
        report: {
          totalRows: allProducts.length,
          successCount: report.successes.length,
          errorCount: report.errors.length,
          successes: report.successes,
          errors: report.errors,
        },
      };
    }
  }

  async getExportProducts(): Promise<Product[]> {
    const products = await Product.findAll({
      include: [
        {
          model: Category,
          attributes: ['name'],
          through: { attributes: [] }, // ignoramos datos de la tabla intermedia
        },
      ],
      order: [['id', 'ASC']],
    });

    return products;
  }

  async exportProductsToExcel(products: Product[]) {
    const workbook = xlsx.utils.book_new();

    const headers = [
      'ID',
      'Nombre',
      'Descripcion',
      'PrecioVenta',
      'Stock',
      'SKU',
      'Categorias',
      'Estado',
      'Imagen', // ✅ nueva columna
    ];

    const data = products.map(product => [
      product.id,
      product.name ?? '',
      product.description ?? '',
      (product.price ?? 0).toFixed(2),
      product.stock ?? 0,
      product.sku ?? '',
      product.categories?.map(c => c.name).join(', ') ?? '',
      product.status ?? '',
      product.URL ?? '', // ✅ exportar la URL
    ]);

    const worksheet = xlsx.utils.aoa_to_sheet([headers, ...data]);
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Productos');

    const buffer = xlsx.write(workbook, { type: 'buffer' });
    return buffer;
  }


  async generateExampleImportExcelWithReference() {
    const workbook = xlsx.utils.book_new();

    const headers = [
      'Nombre',
      'Descripcion',
      'PrecioVenta',
      'PrecioCompra',
      'Stock',
      'SKU',
      'Categorias',
      'Estado',
      'Proveedor',
      'Imagen', // ✅ nueva columna
    ];

    const exampleRows = [
      ['Camiseta Futbol Roja', 'Camiseta de fútbol color rojo, talla M', '49.99', '25.50', '100', 'CF-ROJA-M', 'Ropa Deportiva, Remera Manga Larga', 'active', 'Proveedor A', 'https://misimagenes.com/camiseta-roja.jpg'],
      ['Balón Futbol Oficial', 'Balón de fútbol tamaño oficial, FIFA', '79.99', '50.00', '50', 'BF-OFICIAL', 'Accesorios', 'active', 'Proveedor B', 'https://misimagenes.com/balon-oficial.jpg']
    ];

    const worksheet = xlsx.utils.aoa_to_sheet([headers, ...exampleRows]);
    xlsx.utils.book_append_sheet(workbook, worksheet, 'EjemploCompras');

    // Hoja de instrucciones
    const instructionsSheet = xlsx.utils.aoa_to_sheet([
      ['Instrucciones:'],
      ['1. No incluyas el ID, el producto se identifica por nombre y categoría.'],
      ['2. Rellena todos los campos obligatorios.'],
      ['3. Stock indica la cantidad adquirida en esta compra.'],
      ['4. PrecioCompra es el precio al que compraste el producto.'],
      ['5. PrecioVenta es el precio que mostrarás en tu tienda.'],
      ['6. Proveedor es obligatorio.'],
      ['7. Se pueden registar varias categorias separadas por coma (Celular, Samsung).'],
      ['8. Estado puede ser active, inactive o out_of_stock.'],
      ['9. Consulta la hoja "ProductosExistentes" para copiar nombres exactos.']
    ]);
    xlsx.utils.book_append_sheet(workbook, instructionsSheet, 'Instrucciones');

    // Obtener productos existentes con su categoría
    const existingProducts = await Product.findAll({
      include: [{ model: Category, attributes: ['name'] }],
      attributes: ['name'],
    });

    const referenceData = existingProducts.map(p => [
      p.name,
      p.categories?.map(c => c.name).join(', ') ?? '', // unir varias categorías
    ]);

    const referenceSheet = xlsx.utils.aoa_to_sheet([['Nombre', 'Categoria'], ...referenceData]);
    xlsx.utils.book_append_sheet(workbook, referenceSheet, 'ProductosExistentes');

    const buffer = xlsx.write(workbook, { type: 'buffer' });
    return buffer;
  }

}
