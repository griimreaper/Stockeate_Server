import { BadRequestException, HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from '../order-items/entities/order-item.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Product } from '../products/entities/product.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import * as xlsx from 'xlsx';
import { User } from 'src/users/entities/user.entity';
import { SheetsOrderDto } from 'src/excel-products/dto/sheetOrder.dto';
import { Op } from 'sequelize';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order) private readonly orderModel: typeof Order,
    @InjectModel(OrderItem) private readonly orderItemModel: typeof OrderItem,
    @InjectModel(Customer) private readonly customerModel: typeof Customer,
    @InjectModel(Product) private readonly productModel: typeof Product,
  ) { }

  // OrderService.ts
  async findAllPaginated(
    options: any,
    limit: number,
    offset: number,
    orderBy: string = 'createdAt',
    order: 'ASC' | 'DESC' = 'DESC',
    search?: string,
  ) {
    // Total real de órdenes, incluyendo el filtro de búsqueda por Customer.name
    const total = await Order.count({
      where: options.where || {},
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'name'],
          where: search ? { name: { [Op.iLike]: `%${search}%` } } : undefined,
        },
      ],
    });

    // Traer filas con joins
    const rows = await Order.findAll({
      where: options.where || {},
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'name'],
          where: search ? { name: { [Op.iLike]: `%${search}%` } } : undefined,
        },
        {
          model: OrderItem,
          as: 'items',
          include: [{ model: Product, as: 'product' }],
        },
      ],
    });

    const plainOrders = rows.map(o => o.toJSON());

    // Ordenamiento
    const sorted = plainOrders.sort((a, b) => {
      if (orderBy === 'customer') {
        const nameA = a.customer?.name || '';
        const nameB = b.customer?.name || '';
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

    // Paginado manual
    const paginated = sorted.slice(offset, offset + limit);

    return { data: paginated, total };
  }


  // Obtener orden por ID junto con productos y cliente
  async findOne(tenantId: string, id: string) {
    let order;

    if (id !== 'create') {
      order = await Order.findOne({
        where: { id, tenantId },
        include: [
          {
            model: Customer,
            attributes: ['id', 'name', 'email', 'phone'],
          },
          {
            model: OrderItem,
            include: [{ model: Product, attributes: ['id', 'name', 'price'] }],
          },
        ],
      });

      if (!order) throw new NotFoundException(`Order with ID ${id} not found`);
    }


    // Obtener todos los clientes y productos del tenant para el formulario
    const customers = await this.customerModel.findAll({
      where: { tenantId },
      attributes: ['name']
    });

    // 2️⃣ Traer todos los productos del tenant
    const products = await Product.findAll({
      where: { tenantId },
      attributes: ['id', 'name', 'price', 'stock'], // solo lo que necesitamos
    });

    return { order, customers, products };
  }

  // Crear orden
  async create(tenantId: string, userId: string, payload: CreateOrderDto) {

    const transaction = await Order.sequelize.transaction();

    try {
      // Resolver customerId a partir de customer.name si no hay customer.id
      let customerId = payload.customer.id;
      if (!customerId && payload.customer.name) {
        const foundCustomer = await Customer.findOne({ where: { name: payload.customer.name, tenantId }, transaction });
        if (!foundCustomer) {
          throw new NotFoundException(`Cliente ${payload.customer.name} no encontrado`);
        }
        customerId = foundCustomer.id;
      }
      if (!customerId) {
        throw new BadRequestException('Se requiere un customerId válido o un nombre de cliente');
      }

      // Preparar items, validar stock y calcular total
      let calculatedTotal = 0;
      const newItems = [];
      if (payload.items && payload.items.length) {
        for (const item of payload.items) {
          let finalProductId = item.productId;
          if (!finalProductId && item.name) {
            const foundProduct = await Product.findOne({ where: { name: item.name, tenantId }, transaction });
            if (!foundProduct) {
              throw new NotFoundException(`Producto ${item.name} no encontrado`);
            }
            finalProductId = foundProduct.id;
          }
          if (!finalProductId) {
            throw new BadRequestException('Se requiere un productId válido o un nombre de producto');
          }

          // Validar stock
          const product = await Product.findOne({ where: { id: finalProductId, tenantId }, transaction });
          if (!product) {
            throw new NotFoundException(`Producto con ID ${finalProductId} no encontrado`);
          }
          const quantity = item.quantity || 0;
          if (product.stock < quantity) {
            throw new BadRequestException(`Stock insuficiente para producto ${product.name}. Stock actual: ${product.stock}, Requerido: ${quantity}`);
          }

          newItems.push({
            productId: finalProductId,
            quantity: quantity,
            price: item.price || 0,
            orderId: null, // Se asignará después de crear la orden
          });
          calculatedTotal += quantity * (item.price || 0);
        }
      }

      // Crear la orden
      const orderPayload = {
        tenantId,
        customerId,
        userId,
        status: payload.status || 'pending',
        orderDate: payload.orderDate ? new Date(payload.orderDate) : new Date(),
        total: calculatedTotal,
      };
      const order = await Order.create(orderPayload, { transaction });

      // Crear los items y reducir stock
      if (newItems.length) {
        const itemsToCreate = newItems.map((item) => ({
          ...item,
          orderId: order.id,
        }));
        await OrderItem.bulkCreate(itemsToCreate, { transaction });

        // Reducir stock de cada producto
        for (const item of newItems) {
          const product = await Product.findOne({ where: { id: item.productId, tenantId }, transaction });
          await product.update({ stock: product.stock - item.quantity }, { transaction });
        }
      }

      await transaction.commit();
      const createdOrder = await this.findOne(tenantId, order.id);
      return createdOrder;
    } catch (err: any) {
      await transaction.rollback();
      throw err;
    }
  }
  async update(tenantId: string, id: string, payload: UpdateOrderDto) {

    const transaction = await Order.sequelize.transaction();

    try {
      const order = await Order.findOne({ where: { id, tenantId }, transaction });
      if (!order) {
        throw new NotFoundException('Order not found');
      }

      // Separar items y manejar customer/customerId lógicamente
      const { items, customer, ...orderPayload } = payload;

      let finalCustomerId = order.customerId;
      if (customer) {
        const foundCustomer = await Customer.findOne({ where: { name: customer, tenantId }, transaction });
        if (!foundCustomer) {
          throw new NotFoundException(`Cliente ${customer} no encontrado`);
        }
        finalCustomerId = foundCustomer.id;
      }

      // Actualizar orden con customerId resuelto
      await order.update({ ...orderPayload, customerId: finalCustomerId }, { transaction });

      // Procesar items
      let calculatedTotal = order.total;

      if (items) {
        // Obtener items actuales para restaurar stock
        const currentItems = await OrderItem.findAll({ where: { orderId: id }, transaction });
        for (const currentItem of currentItems) {
          const product = await Product.findOne({ where: { id: currentItem.productId, tenantId }, transaction });
          if (product) {
            await product.update({ stock: product.stock + currentItem.quantity }, { transaction });
          }
        }
        await OrderItem.destroy({ where: { orderId: id }, transaction });

        const newItems = [];
        for (const item of items) {
          let finalProductId = item.productId;
          if (!finalProductId && item.name) {
            const foundProduct = await Product.findOne({ where: { name: item.name, tenantId }, transaction });
            if (!foundProduct) {
              throw new NotFoundException(`Producto ${item.name} no encontrado`);
            }
            finalProductId = foundProduct.id;
          }
          if (!finalProductId) {
            throw new BadRequestException('Se requiere un productId válido o un nombre de producto');
          }

          // Validar stock
          const product = await Product.findOne({ where: { id: finalProductId, tenantId }, transaction });
          if (!product) {
            throw new NotFoundException(`Producto con ID ${finalProductId} no encontrado`);
          }
          const quantity = item.quantity || 0;
          if (product.stock < quantity) {
            throw new BadRequestException(`Stock insuficiente para producto ${product.name}. Stock actual: ${product.stock}, Requerido: ${quantity}`);
          }

          newItems.push({
            orderId: id,
            productId: finalProductId,
            quantity: quantity,
            price: item.price || 0,
          });
        }

        // Crear nuevos items y reducir stock
        if (newItems.length) {
          await OrderItem.bulkCreate(newItems, { transaction });

          for (const item of newItems) {
            const product = await Product.findOne({ where: { id: item.productId, tenantId }, transaction });
            await product.update({ stock: product.stock - item.quantity }, { transaction });
          }
        }

        // Calcular total
        calculatedTotal = newItems.reduce(
          (sum, item) => sum + (item.quantity || 0) * (item.price || 0),
          0,
        );
      }

      // Actualizar total si cambió
      if (calculatedTotal !== order.total) {
        await order.update({ total: calculatedTotal }, { transaction });
      }

      await transaction.commit();
      const updatedOrder = await this.findOne(tenantId, id);
      return updatedOrder;
    } catch (err: any) {
      await transaction.rollback();
      throw err;
    }
  }

  // Eliminar orden
  async remove(tenantId: string, id: string) {
    const order = await Order.findOne({ where: { id, tenantId } });
    if (!order) throw new NotFoundException('Order not found');

    // Primero eliminar los items
    await OrderItem.destroy({ where: { orderId: id } });

    // Luego eliminar la orden
    await order.destroy();

    return { success: true };
  }

  // Exportar órdenes
  async getExportOrders(): Promise<Order[]> {
    return Order.findAll({
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['name'],
        },
        {
          model: User,
          as: 'user',
          attributes: ['name'],
        },
        {
          model: OrderItem,
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
      order: [['orderDate', 'DESC']],
    });
  }

  async exportOrdersToExcel(orders: Order[]) {
    const workbook = xlsx.utils.book_new();
    const headers = [
      'ID',
      'Cliente',
      'Usuario',
      'Estado',
      'Fecha',
      'Productos',
      'Cantidades',
      'Precios',
    ];

    const data = orders.map((o) => {
      const productos = o.items?.map((i) => i.product?.name).join(', ') || '';
      const cantidades = o.items?.map((i) => i.quantity).join(', ') || '';
      const precios = o.items?.map((i) => i.price).join(', ') || '';

      return [
        o.id,
        o.customer?.name ?? '',
        o.user?.name ?? '',
        o.status,
        o.orderDate ? o.orderDate.toISOString().slice(0, 10) : '',
        productos,
        cantidades,
        precios,
      ];
    });

    // --- Hoja principal con las órdenes ---
    const worksheet = xlsx.utils.aoa_to_sheet([headers, ...data]);
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Orders');

    // --- Hoja de metadatos ---
    const metaSheet = xlsx.utils.aoa_to_sheet([
      ['Fecha de exportación', new Date().toISOString()],
      ['Total de órdenes', orders.length],
      ['Instrucciones', SheetsOrderDto.getDescripcion()],
    ]);
    xlsx.utils.book_append_sheet(workbook, metaSheet, 'Metadatos');

    // --- Hoja con Customers (referencia) ---
    const customers = orders.map((o) => [
      o.customer?.id ?? '',
      o.customer?.name ?? '',
    ]);
    const customersUnique = Array.from(
      new Map(customers.map(([id, name]) => [id, [id, name]])).values(),
    ); // eliminar duplicados
    const customersSheet = xlsx.utils.aoa_to_sheet([
      ['ID', 'Nombre'],
      ...customersUnique,
    ]);
    xlsx.utils.book_append_sheet(workbook, customersSheet, 'Customers');

    // --- Hoja con Productos (referencia) ---
    const productos = orders.flatMap((o) =>
      o.items?.map((i) => [i.product?.id ?? '', i.product?.name ?? '']) || [],
    );
    const productosUnique = Array.from(
      new Map(productos.map(([id, name]) => [id, [id, name]])).values(),
    ); // eliminar duplicados
    const productosSheet = xlsx.utils.aoa_to_sheet([
      ['ID', 'Nombre'],
      ...productosUnique,
    ]);
    xlsx.utils.book_append_sheet(workbook, productosSheet, 'Productos');

    return xlsx.write(workbook, { type: 'buffer' });
  }

  async generateExampleOrderExcel() {

    const workbook = xlsx.utils.book_new();
    const headers = [
      'Cliente',
      'Usuario',
      'Estado',
      'Fecha',
      'Productos',
      'Cantidades',
      'Precios',
    ];

    // Obtener clientes reales de la base de datos
    const customers = await Customer.findAll({ attributes: ['id', 'name'] });

    // Obtener productos reales de la base de datos
    const products = await Product.findAll({ attributes: ['id', 'name', 'price', 'stock'] });

    // Generar filas de ejemplo usando datos reales
    const exampleRows = [
      [
        'Cliente 1', // Cliente A
        'Vendedor 1',
        'pending',
        '2025-09-15',
        `Remera manga larga, Pantalon cargo`, // Camiseta Roja, Shorts
        '2, 1',
        '50, 50',
      ],
      [
        'Cliente 2', // Cliente B
        'Vendedor2',
        'completed',
        '2025-09-10',
        `Gorra Azul, Zapatillas`, // Gorra Azul, Zapatillas
        '1, 1',
        '20, 130',
      ],
    ];

    // --- Hoja principal con las órdenes de ejemplo ---
    const worksheet = xlsx.utils.aoa_to_sheet([headers, ...exampleRows]);
    xlsx.utils.book_append_sheet(workbook, worksheet, 'EjemploOrders');

    // --- Hoja de instrucciones ---
    const instructionsSheet = xlsx.utils.aoa_to_sheet([
      ['Instrucciones:'],
      ['1. ID solo se usa en actualizaciones.'],
      ['2. Cliente y Usuario deben existir en el sistema.'],
      [
        '3. Los productos deben existir y estar separados por comas. ' +
        'Cantidades y Precios deben estar alineados por índice.',
      ],
      ['4. Ver las hojas "Customers" y "Productos" para referencias de nombres válidos.'],
    ]);
    xlsx.utils.book_append_sheet(workbook, instructionsSheet, 'Instrucciones');

    // --- Hoja con Customers (referencia) ---
    const customersSheetData = customers.map(c => [c.id, c.name]);
    const customersSheet = xlsx.utils.aoa_to_sheet([
      ['ID', 'Nombre'],
      ...customersSheetData,
    ]);
    xlsx.utils.book_append_sheet(workbook, customersSheet, 'Customers');

    // --- Hoja con Productos (referencia) ---
    const productsSheetData = products.map(p => [p.id, p.name, p.price, p.stock]);
    const productsSheet = xlsx.utils.aoa_to_sheet([
      ['ID', 'Nombre', 'Precio', 'Stock'],
      ...productsSheetData,
    ]);
    xlsx.utils.book_append_sheet(workbook, productsSheet, 'Productos');

    return xlsx.write(workbook, { type: 'buffer' });
  }

  // Importar órdenes desde Excel
  async importOrdersFromExcel(
    tenantId: string,
    allOrders: SheetsOrderDto[],
  ) {

    const transaction = await Order.sequelize.transaction();
    const report = { successes: [], errors: [] };

    try {
      for (let i = 0; i < allOrders.length; i++) {
        const rowIndex = i + 2;
        const o = allOrders[i];

        try {
          // Buscar o crear cliente
          const [customer, created] = await Customer.findOrCreate({
            where: { name: o.Cliente, tenantId },
            defaults: {
              tenantId,
              name: o.Cliente,
              email: `${o.Cliente.toLowerCase().replace(/\s+/g, '')}@ejemplo.com`, // Email por defecto
              phone: null,
              city: null,
              country: null,
            },
            transaction,
          });

          // Buscar usuario si viene
          let user = null;
          if (o.Usuario) {
            user = await User.findOne({
              where: { name: o.Usuario, tenantId },
              transaction,
            });
            if (!user) {
              report.errors.push({
                row: rowIndex,
                order: i,
                error: `Usuario ${o.Usuario} no encontrado`,
              });
              continue;
            }
          }

          let calculatedTotal = 0;
          let nombres: string[] = [];
          let cantidades: number[] = [];
          let precios: number[] = [];

          if (o.Productos) {
            nombres = o.Productos.split(',').map((x) => x.trim());
            cantidades = o.Cantidades
              ? o.Cantidades.split(',').map((x) => Number(x.trim()))
              : nombres.map(() => 1);
            precios = o.Precios
              ? o.Precios.split(',').map((x) => Number(x.trim()))
              : nombres.map(() => 0);

            for (let idx = 0; idx < nombres.length; idx++) {
              const qty = cantidades[idx] || 1;
              const price = precios[idx] || 0;
              calculatedTotal += qty * price;
            }

            // Validar stock de productos antes de crear la orden
            for (let idx = 0; idx < nombres.length; idx++) {
              const product = await Product.findOne({
                where: { name: nombres[idx], tenantId },
                transaction,
              });
              if (!product) {
                report.errors.push({
                  row: rowIndex,
                  order: i,
                  error: `Producto ${nombres[idx]} no encontrado`,
                });
              }
              const qty = cantidades[idx] || 1;
              if (product.stock < qty) {
                report.errors.push({
                  row: rowIndex,
                  order: i,
                  error: `Stock insuficiente para producto ${nombres[idx]}. Stock actual: ${product.stock}, Requerido: ${qty}`,
                });
              }
            }
          }

          // Crear orden
          const order = await Order.create(
            {
              tenantId,
              customerId: customer.id,
              userId: user?.id,
              status: o.Estado,
              orderDate: new Date(o.Fecha),
              total: calculatedTotal,
            },
            { transaction },
          );

          // Asociar productos y reducir stock
          for (let idx = 0; idx < nombres.length; idx++) {
            const product = await Product.findOne({
              where: { name: nombres[idx], tenantId },
              transaction,
            });
            // No es necesario verificar existencia de producto aquí, ya se validó arriba
            const qty = cantidades[idx] || 1;

            await OrderItem.create(
              {
                orderId: order.id,
                productId: product.id,
                quantity: qty,
                price: precios[idx],
              },
              { transaction },
            );

            // Reducir stock del producto
            await product.update(
              { stock: product.stock - qty },
              { transaction },
            );
          }

          report.successes.push({
            row: rowIndex,
            order: order.id,
            action: 'created',
          });
        } catch (err: any) {
          report.errors.push({
            row: rowIndex,
            order: i,
            error: err.message,
          });
        }
      }

      if (report.errors.length > 0) {
        throw new HttpException('Errores en la importación de algunas órdenes', 400);
      }

      await transaction.commit();
      return { statusCode: 201, message: 'Importación completada', report };
    } catch (err: any) {
      await transaction.rollback();
      return { statusCode: 500, message: 'Importación fallida', report };
    }
  }

  // Actualizar órdenes desde Excel
  async updateOrdersFromExcel(
    tenantId: string,
    allOrders: SheetsOrderDto[],
  ) {
    const transaction = await Order.sequelize.transaction();
    const report = { successes: [], errors: [] };

    try {
      for (let i = 0; i < allOrders.length; i++) {
        const rowIndex = i + 2;
        const o = allOrders[i];

        if (!o.ID) {
          report.errors.push({
            row: rowIndex,
            error: 'ID no definido',
          });
          continue;
        }

        const dbOrder = await Order.findOne({
          where: { id: o.ID, tenantId },
          include: [{ model: OrderItem, as: 'items' }],
          transaction,
        });

        if (!dbOrder) {
          report.errors.push({
            row: rowIndex,
            error: `No se encontró ID ${o.ID} para este tenant`,
          });
          continue;
        }

        // Buscar cliente
        const customer = await Customer.findOne({
          where: { name: o.Cliente, tenantId },
          transaction,
        });
        if (!customer) {
          report.errors.push({
            row: rowIndex,
            error: `Cliente ${o.Cliente} no encontrado`,
          });
          continue;
        }

        // Buscar usuario
        let user = null;
        if (o.Usuario) {
          user = await User.findOne({
            where: { name: o.Usuario, tenantId },
            transaction,
          });
          if (!user) {
            report.errors.push({
              row: rowIndex,
              error: `Usuario ${o.Usuario} no encontrado`,
            });
            continue;
          }
        }

        let calculatedTotal = 0;
        let nombres: string[] = [];
        let cantidades: number[] = [];
        let precios: number[] = [];

        if (o.Productos) {
          nombres = o.Productos.split(',').map((x) => x.trim());
          cantidades = o.Cantidades
            ? o.Cantidades.split(',').map((x) => Number(x.trim()))
            : nombres.map(() => 1);
          precios = o.Precios
            ? o.Precios.split(',').map((x) => Number(x.trim()))
            : nombres.map(() => 0);

          for (let idx = 0; idx < nombres.length; idx++) {
            const qty = cantidades[idx] || 1;
            const price = precios[idx] || 0;
            calculatedTotal += qty * price;
          }
        }

        // Actualizar orden
        await dbOrder.update(
          {
            customerId: customer.id,
            userId: user?.id,
            status: o.Estado,
            orderDate: new Date(o.Fecha),
            total: calculatedTotal,
          },
          { transaction },
        );

        // Actualizar items
        await OrderItem.destroy({ where: { orderId: dbOrder.id }, transaction });

        for (let idx = 0; idx < nombres.length; idx++) {
          const product = await Product.findOne({
            where: { name: nombres[idx], tenantId },
            transaction,
          });
          if (!product) {
            report.errors.push({
              row: rowIndex,
              error: `Producto ${nombres[idx]} no encontrado`,
            });
            continue;
          }

          await OrderItem.create(
            {
              orderId: dbOrder.id,
              productId: product.id,
              quantity: cantidades[idx],
              price: precios[idx],
            },
            { transaction },
          );
        }

        report.successes.push({
          row: rowIndex,
          order: dbOrder.id,
          action: 'updated',
        });
      }

      if (report.errors.length > 0) throw new HttpException('error', 400);

      await transaction.commit();
      return { statusCode: 200, message: 'Órdenes actualizadas', report };
    } catch (err: any) {
      await transaction.rollback();
      return { statusCode: 500, message: 'Actualización fallida', report };
    }
  }

}
