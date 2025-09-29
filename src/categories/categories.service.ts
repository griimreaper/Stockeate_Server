import { HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import * as xlsx from 'xlsx';
import { Product } from 'src/products/entities/product.entity';
import { CategoryProduct } from './entities/categoryProducts.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category)
    private readonly categoryModel: typeof Category,
  ) { }

  // Listar categorías paginadas
  async findAllPaginated(
    options: any,
    limit: number,
    offset: number,
    orderBy: string = 'createdAt',
    order: 'ASC' | 'DESC' = 'DESC',
  ) {
    const { rows, count: total } = await Category.findAndCountAll({
      where: options,
      include: [{
        model: Product,
        through: { attributes: [] },
      }],
      distinct: true, // para que count sea correcto con join
    });


    // Convertir a objetos planos
    const plainCategories = rows.map((c) => c.toJSON());

    // Ordenamiento manual
    const sorted = plainCategories.sort((a, b) => {
      if (orderBy === 'products') {
        const countA = a.products?.length || 0;
        const countB = b.products?.length || 0;
        return order === 'DESC' ? countB - countA : countA - countB;
      } else {
        const valA = a[orderBy];
        const valB = b[orderBy];

        if (valA > valB) return order === 'DESC' ? -1 : 1;
        if (valA < valB) return order === 'DESC' ? 1 : -1;
        return 0;
      }
    });

    // Paginado
    const paginated = sorted.slice(offset, offset + limit);

    return { data: paginated, total };
  }

  // Obtener categoría por ID y todos los productos del tenant
  async findOne(tenantId: string, id: string) {
    if (id === 'create') {
      // Cuando es 'create', no existe la categoría aún
      const products = await Product.findAll({
        where: { tenantId },
        attributes: ['id', 'name'], // solo nombres
      });
      return { category: null, products };
    }

    const category = await Category.findOne({
      where: { id, tenantId },
      include: [{
        model: Product,
        attributes: ["id", "name"]
      }],
    });

    if (!category) throw new NotFoundException(`Category with ID ${id} not found`);

    // Traer todos los productos del tenant
    const products = await Product.findAll({
      where: { tenantId },
      attributes: ['id', 'name'], // solo nombres
    });

    return { category, products };
  }


  async create(tenantId: string, createCategoryDto: CreateCategoryDto) {
    const { products, ...categoryData } = createCategoryDto;

    // Crear categoría
    const category = await Category.create({ ...categoryData, tenantId });

    // Asociar múltiples productos
    if (products?.length) {
      await category.$set('products', products.map((p) => p.id)); // <-- relación many-to-many
    }

    return category;
  }


  async update(tenantId: string, id: string, updateCategoryDto: UpdateCategoryDto) {
    const { category } = await this.findOne(tenantId, id);
    const { products, ...categoryData } = updateCategoryDto;

    // Actualizar datos de la categoría
    await category.update(categoryData);

    // Reemplazar productos asociados (many-to-many)
    if (products?.length) {
      await category.$set('products', products.map((p) => p.id));
    } else {
      await category.$set('products', []); // quitar todos si no se envían
    }

    return category;
  }

  // Exportar categorías
  async getExportCategories(): Promise<Category[]> {
    return Category.findAll({
      order: [['name', 'ASC']],
      include: [
        {
          model: Product,
          as: 'products',
          attributes: ['name'],
          through: { attributes: [] }, // si es belongsToMany
        },
      ],
    });
  }

  async exportCategoriesToExcel(categories: Category[]) {
    const workbook = xlsx.utils.book_new();
    const headers = ['ID', 'Nombre', 'Productos'];

    // Hoja de categorías
    const data = categories.map((c) => [
      c.id,
      c.name ?? '',
      c.products?.map((p) => p.name).join(', ') || '',
    ]);
    const worksheet = xlsx.utils.aoa_to_sheet([headers, ...data]);
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Categories');

    // Hoja de metadatos
    const metaSheet = xlsx.utils.aoa_to_sheet([
      ['Fecha de exportación', new Date().toISOString()],
      ['Total de categorías', categories.length],
      [
        'Instrucciones',
        'No modifiques el ID si vas a actualizar. Puedes editar solo el nombre. ' +
        'Los productos deben existir previamente y puedes listarlos separados por comas.',
      ],
    ]);
    xlsx.utils.book_append_sheet(workbook, metaSheet, 'Metadatos');

    // Obtener productos directamente desde DB
    const products: Product[] = await Product.findAll();

    // Hoja de productos de referencia
    const productHeaders = ['ID', 'Nombre', 'Precio', 'Stock']; // ajustalo según tu modelo real
    const productData = products.map((p) => [
      p.id,
      p.name,
      p.price ?? '',
      p.stock ?? '',
    ]);
    const productsSheet = xlsx.utils.aoa_to_sheet([productHeaders, ...productData]);
    xlsx.utils.book_append_sheet(workbook, productsSheet, 'Productos');

    return xlsx.write(workbook, { type: 'buffer' });
  }

  // Generar ejemplo de Excel
  async generateExampleCategoryExcel() {
    const workbook = xlsx.utils.book_new();
    const headers = ['Nombre', 'Productos'];
    const exampleRows = [
      ['Categoría A', 'Producto1, Producto2'],
      ['Categoría B', 'Producto3, Producto4'],
    ];
    const worksheet = xlsx.utils.aoa_to_sheet([headers, ...exampleRows]);
    xlsx.utils.book_append_sheet(workbook, worksheet, 'EjemploCategories');

    // Instrucciones
    const instructionsSheet = xlsx.utils.aoa_to_sheet([
      ['Instrucciones:'],
      ['1. Rellena todos los campos obligatorios (Nombre).'],
      ['2. No incluyas ID para nuevas creaciones.'],
      ['3. Los productos deben estar separados por comas y ya existir en el sistema.'],
      ['4. Consulta la hoja "Productos" para ver los disponibles.'],
    ]);
    xlsx.utils.book_append_sheet(workbook, instructionsSheet, 'Instrucciones');

    // Productos reales desde la DB
    const products = await Product.findAll();
    const productHeaders = ['ID', 'Nombre', 'Precio', 'Stock']; // ajusta según tu entidad
    const productData = products.map((p) => [
      p.id,
      p.name,
      p.price ?? '',
      p.stock ?? '',
    ]);
    const productsSheet = xlsx.utils.aoa_to_sheet([productHeaders, ...productData]);
    xlsx.utils.book_append_sheet(workbook, productsSheet, 'Productos');

    return xlsx.write(workbook, { type: 'buffer' });
  }

  async importCategoriesFromExcel(
    tenantId: string,
    allCategories: { Nombre: string; Productos?: string[] | string }[],
  ) {
    const transaction = await Category.sequelize.transaction();
    const report = { successes: [], errors: [] };


    try {
      for (let i = 0; i < allCategories.length; i++) {
        const rowIndex = i + 2;
        const c = allCategories[i];

        try {
          // Buscar o crear la categoría
          const [category, created] = await Category.findOrCreate({
            where: { name: c.Nombre, tenantId },
            defaults: { name: c.Nombre, tenantId },
            transaction,
          });

          report.successes.push({
            row: rowIndex,
            category: c.Nombre,
            action: created ? 'created' : 'already_exists',
          });

          // Manejar productos si vienen en el Excel
          if (c.Productos) {
            let productNames: string[] = [];
            if (typeof c.Productos === 'string') {
              productNames = c.Productos.split(',').map(name => name.trim());
            } else if (Array.isArray(c.Productos)) {
              productNames = c.Productos;
            } else {
              productNames = [];
            }

            if (productNames.length) {
              // Borrar relaciones anteriores
              await CategoryProduct.destroy({
                where: { categoryId: category.id },
                transaction,
              });

              // Crear nuevas relaciones
              for (const productName of productNames) {
                const product = await Product.findOne({
                  where: { name: productName, tenantId },
                  transaction,
                });

                if (!product) {
                  report.errors.push({
                    row: rowIndex,
                    category: c.Nombre,
                    error: `Producto "${productName}" no encontrado`,
                  });
                  continue;
                }

                await CategoryProduct.create(
                  { categoryId: category.id, productId: product.id },
                  { transaction },
                );
              }
            }
          }

          report.successes.push({
            row: rowIndex,
            category: c.Nombre,
            action: created ? 'created' : 'updated',
          });
        } catch (err: any) {
          report.errors.push({
            row: rowIndex,
            category: c.Nombre,
            error: err.message,
          });
        }
      }

      if (report.errors.length > 0) {
        throw new HttpException('error', 400);
      }

      await transaction.commit();
      return { statusCode: 201, message: 'Importación completada', report };
    } catch (err: any) {
      await transaction.rollback();
      return { statusCode: 500, message: 'Importación fallida', report };
    }
  }

  async updateCategoriesFromExcel(
    tenantId: string,
    allCategories: { ID: string; Nombre: string; Productos?: string[] | string }[],
  ) {
    const transaction = await Category.sequelize.transaction();
    const report = { successes: [], errors: [] };

    try {
      for (let i = 0; i < allCategories.length; i++) {
        const rowIndex = i + 2;
        const c = allCategories[i];

        if (!c.ID) {
          report.errors.push({
            row: rowIndex,
            category: c.Nombre,
            error: 'ID no definido',
          });
          continue;
        }

        const dbCategory = await Category.findOne({
          where: { id: c.ID, tenantId },
          transaction,
        });

        if (!dbCategory) {
          report.errors.push({
            row: rowIndex,
            category: c.Nombre,
            error: `No se encontró ID ${c.ID} para este tenant`,
          });
          continue;
        }

        if (c.Nombre) {
          await dbCategory.update({ name: c.Nombre }, { transaction });
        }

        if (c.Productos) {
          let productNames: string[] = [];
          if (typeof c.Productos === 'string') {
            productNames = c.Productos.split(',').map(name => name.trim());
          } else if (Array.isArray(c.Productos)) {
            productNames = c.Productos;
          } else {
            productNames = [];
          }

          if (productNames.length) {
            await CategoryProduct.destroy({
              where: { categoryId: dbCategory.id },
              transaction,
            });

            for (const productName of productNames) {
              const product = await Product.findOne({
                where: { name: productName, tenantId },
                transaction,
              });

              if (!product) {
                report.errors.push({
                  row: rowIndex,
                  category: c.Nombre,
                  error: `Producto "${productName}" no encontrado`,
                });
                continue;
              }

              await CategoryProduct.create(
                { categoryId: dbCategory.id, productId: product.id },
                { transaction },
              );
            }
          }
        }

        report.successes.push({
          row: rowIndex,
          category: c.Nombre,
          action: 'updated',
        });
      }

      if (report.errors.length > 0) {
        throw new HttpException('error', 400);
      }

      await transaction.commit();
      return { statusCode: 200, message: 'Categories actualizadas', report };
    } catch (err: any) {
      await transaction.rollback();
      return { statusCode: 500, message: 'Actualización fallida', report };
    }
  }

  async cleanupUnusedCategories(tenantId: string, transaction) {
    const categories = await Category.findAll({
      where: { tenantId },
      include: [{ model: Product, attributes: ['id'] }],
      transaction,
    });

    const unusedCategories = categories.filter(cat => !cat.products || cat.products.length === 0);

    if (unusedCategories.length > 0) {
      await Category.destroy({
        where: { id: unusedCategories.map(c => c.id) },
        transaction,
      });
    }
  }

  // Eliminar categoría
  async remove(tenantId: string, id: string) {
    const { category } = await this.findOne(tenantId, id);

    await category.destroy();

    return { message: 'Category deleted successfully' };
  }
}
