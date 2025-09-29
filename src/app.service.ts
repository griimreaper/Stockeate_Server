import { Injectable } from '@nestjs/common';
import { Order, OrderStatus } from './orders/entities/order.entity';
import { Product, ProductStatus } from './products/entities/product.entity';
import { Customer } from './customers/entities/customer.entity';
import { Supplier } from './suppliers/entities/supplier.entity';
import { Purchase } from './purchases/entities/purchase.entity';
import { Op, fn, col, literal } from 'sequelize';
import { Category } from './categories/entities/category.entity';
import { OrderItem } from './order-items/entities/order-item.entity';

export interface SubMetric {
  title: string;
  value: string | string[] | Array<{ name: string; sales: number }> | any;
  icon: string;
  type: 'sales_chart' | 'text' | 'list' | 'top_products' | 'bar_chart' | 'top_sales' | 'list2' | 'none';
  chartData?: any;
}

interface WeeklyOrder {
  periodo: string;
  ventas: number;
}

interface WeeklyPurchase {
  periodo: string;
  compras: number;
}

interface CustomerWithSales {
  id: string;
  name: string;
  sales: number;
}

interface SupplierWithSales {
  id: string;
  name: string;
  sales: number;
}

@Injectable()
export class AppService {
  constructor() { }

  getHello(): string {
    return 'Hello World!';
  }

  async getGeneralMetrics(tenantId: string): Promise<{ metrics: [string, number][], generalMetrics: SubMetric[] }> {

    // Ventas Totales (sales_chart) - Weekly orders and purchases
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

    const orders = (await Order.findAll({
      where: {
        tenantId,
        createdAt: { [Op.gte]: fourWeeksAgo },
      },
      attributes: [
        [fn('DATE_TRUNC', 'week', col('created_at')), 'periodo'],
        [fn('COUNT', col('id')), 'ventas'],
      ],
      group: ['periodo'],
      order: [[literal('periodo'), 'DESC']],
      limit: 4,
      raw: true,
    })) as unknown as WeeklyOrder[];

    const purchases = (await Purchase.findAll({
      where: {
        tenantId,
        createdAt: { [Op.gte]: fourWeeksAgo },
      },
      attributes: [
        [fn('DATE_TRUNC', 'week', col('created_at')), 'periodo'],
        [fn('COUNT', col('id')), 'compras'],
      ],
      group: ['periodo'],
      order: [[literal('periodo'), 'DESC']],
      limit: 4,
      raw: true,
    })) as unknown as WeeklyPurchase[];

    // Función para normalizar un periodo a YYYY-MM-DD (sin horas ni TZ)
    const normalizePeriod = (date: Date | string) => {
      const d = new Date(date);
      return d.toISOString().substring(0, 10); // solo YYYY-MM-DD
    };

    // Unir periodos únicos
    const periods = [...new Set([
      ...orders.map(o => normalizePeriod(o.periodo)),
      ...purchases.map(p => normalizePeriod(p.periodo)),
    ])]
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    // Combinar datos
    const salesChartData = periods.map(period => {
      const order = orders.find(o => normalizePeriod(o.periodo) === period);
      const purchase = purchases.find(p => normalizePeriod(p.periodo) === period);
      return {
        periodo: period,
        Ventas: order ? Number(order.ventas) : 0,
        Compras: purchase ? Number(purchase.compras) : 0,
      };
    });

    // Labels para el gráfico
    const labels = salesChartData
      .map(row => new Date(row.periodo).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }))
      .reverse();

    const ventasData = salesChartData.map(row => row.Ventas).reverse();
    const comprasData = salesChartData.map(row => row.Compras).reverse();
    // Ingresos Totales (text)
    const totalIngresos = await Order.sum('total', {
      where: { status: OrderStatus.COMPLETED, tenantId },
    });

    // Órdenes Pendientes (list)
    const ordenesPendientes = await Order.findAll({
      where: { status: OrderStatus.PENDING, tenantId },
      include: [Customer],
      attributes: ['id'],
      limit: 2,
    });
    const formattedOrdenesPendientes = ordenesPendientes.map(o => [`Orden #${o.id}`, `${o.customer.name}`]);

    // Productos Activos (list)
    const productosActivos = await Product.findAll({
      where: { status: ProductStatus.ACTIVE, tenantId },
      attributes: ['name'],
      limit: 3,
    });
    const formattedProductosActivos = productosActivos.map(p => p.name);

    // Clientes Activos (top_products)
    const clientesActivos = (await Customer.findAll({
      where: { tenantId },
      attributes: [
        'id',
        'name',
        [literal(`(SELECT COUNT(*) FROM "Orders" WHERE "Orders"."customer_id" = "Customer"."id" AND "Orders"."tenant_id" = '${tenantId}')`), 'sales'],
      ],
      group: ['Customer.id', 'Customer.name'],
      order: [[literal('sales'), 'DESC']],
      limit: 3,
      raw: true,
    })) as unknown as CustomerWithSales[];
    const formattedClientesActivos = clientesActivos.map(row => ({
      name: row.name,
      sales: Number(row.sales),
    }));

    // Proveedores Principales (top_products)
    const proveedoresPrincipales = (await Supplier.findAll({
      where: { tenantId },
      attributes: [
        'id',
        'name',
        [literal(`(SELECT COUNT(*) FROM "Purchases" WHERE "Purchases"."supplier_id" = "Supplier"."id" AND "Purchases"."tenant_id" = '${tenantId}')`), 'sales'],
      ],
      group: ['Supplier.id', 'Supplier.name'],
      order: [[literal('sales'), 'DESC']],
      limit: 3,
      raw: true,
    })) as unknown as SupplierWithSales[];
    const formattedProveedoresPrincipales = proveedoresPrincipales.map(row => ({
      name: row.name,
      sales: Number(row.sales),
    }));

    // Gráfico para Ventas Totales
    const salesChart = {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Ventas',
            data: ventasData,
            borderColor: '#4CAF50',
            backgroundColor: 'rgba(76, 175, 80, 0.2)',
            fill: true,
          },
          {
            label: 'Compras',
            data: comprasData,
            borderColor: '#2196F3',
            backgroundColor: 'rgba(33, 150, 243, 0.2)',
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'top' },
          title: { display: true, text: 'Ventas y Compras Semanales' },
        },
        scales: {
          y: { beginAtZero: true },
        },
      },
    };

    // 1️⃣ Productos más vendidos (TOP)
    const orderItemsForTop = await OrderItem.findAll({
      include: [
        {
          model: Product,
          attributes: ['id', 'name'],
          where: { tenantId },
        },
        {
          model: Order,
          attributes: [],
          where: { tenantId, deleted_at: null },
        },
      ],
      where: { deleted_at: null },
    });

    const productSalesMap: { [key: string]: { name: string; sales: number } } = {};

    orderItemsForTop.forEach((item: any) => {
      const productId = item.product.id;
      const name = item.product.name;
      if (!productSalesMap[productId]) {
        productSalesMap[productId] = { name, sales: 0 };
      }
      productSalesMap[productId].sales += item.quantity;
    });

    const topProducts = Object.values(productSalesMap)
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);

    // --- Nuevo cálculo: Clientes recurrentes ---
    const allOrders = await Order.findAll({
      where: { tenantId, deleted_at: null },
      attributes: ['customerId'],
      raw: true,
    });

    const customerOrderMap: Record<string, number> = {};
    allOrders.forEach(o => {
      if (!o.customerId) return;
      if (!customerOrderMap[o.customerId]) customerOrderMap[o.customerId] = 0;
      customerOrderMap[o.customerId]++;
    });

    const recurringCustomersCount = Object.values(customerOrderMap).filter(v => v > 1).length;

    const totalCompletedOrders = await Order.count({
      where: { tenantId, status: OrderStatus.COMPLETED },
    });

    const metrics: SubMetric[] = [
      {
        title: 'Ventas Totales',
        value: `${(ventasData.reduce((a: number, b: number) => a + b, 0) || 0).toLocaleString('es')} unidades`,
        icon: 'ShoppingCart',
        type: 'sales_chart',
        chartData: salesChart,
      },
      {
        title: 'Órdenes Pendientes',
        value: formattedOrdenesPendientes.length ? formattedOrdenesPendientes : ['Sin órdenes pendientes'],
        icon: 'ShoppingCart',
        type: 'list2',
      },
      {
        title: 'Clientes Activos',
        value: formattedClientesActivos.length ? formattedClientesActivos : [{ name: 'Sin clientes', sales: 0 }],
        icon: 'Users',
        type: 'top_products',
      },
      {
        title: 'Clientes Recurrentes',
        value: recurringCustomersCount,
        icon: 'Users',
        type: 'text',
      },
      {
        title: '',
        value: '',
        icon: '',
        type: 'none',
      },
      {
        title: 'Ingresos Totales',
        value: `$${totalIngresos ? totalIngresos.toLocaleString('es') : '0'}`,
        icon: 'DollarSign',
        type: 'text',
      },
      {
        title: 'Productos Más Vendidos',
        value: topProducts.length ? topProducts : [{ name: 'Sin ventas', sales: 0 }],
        icon: 'Box',
        type: 'top_products',
      },
      {
        title: 'Productos Activos',
        value: formattedProductosActivos.length ? formattedProductosActivos : ['Sin productos activos'],
        icon: 'Layers',
        type: 'list',
      },
      {
        title: 'Proveedores Principales',
        value: formattedProveedoresPrincipales.length ? formattedProveedoresPrincipales : [{ name: 'Sin proveedores', sales: 0 }],
        icon: 'Archive',
        type: 'top_products',
      },
      {
        title: 'Órdenes Completadas',
        value: `${totalCompletedOrders} órdenes`,
        icon: 'Archive',
        type: 'text',
      },
    ];

    // --- AÑADIDO: conteos totales por entidad ---
    const [
      productsCount,
      customersCount,
      suppliersCount,
      ordersCount,
      purchasesCount,
      categoriesCount,
    ] = await Promise.all([
      Product.count({ where: { tenantId } }),
      Customer.count({ where: { tenantId } }),
      Supplier.count({ where: { tenantId } }),
      Order.count({ where: { tenantId } }),
      Purchase.count({ where: { tenantId } }),
      Category.count({ where: { tenantId } }), // asegúrate de tener el modelo Category
    ]);

    const countsMetrics: [string, number][] = [
      ['Products', Number(productsCount)],
      ['Customers', Number(customersCount)],
      ['Suppliers', Number(suppliersCount)],
      ['Orders', Number(ordersCount)],
      ['Purchases', Number(purchasesCount)],
      ['Categories', Number(categoriesCount)],
    ];

    return {
      metrics: countsMetrics,
      generalMetrics: metrics
    };
  }

  async getProductMetrics(tenantId: string): Promise<SubMetric[]> {
    // 1️⃣ Productos más vendidos (TOP)
    const orderItemsForTop = await OrderItem.findAll({
      include: [
        {
          model: Product,
          attributes: ['id', 'name'],
          where: { tenantId },
        },
        {
          model: Order,
          attributes: [],
          where: { tenantId, deleted_at: null },
        },
      ],
      where: { deleted_at: null },
    });

    const productSalesMap: { [key: string]: { name: string; sales: number } } = {};

    orderItemsForTop.forEach((item: any) => {
      const productId = item.product.id;
      const name = item.product.name;
      if (!productSalesMap[productId]) {
        productSalesMap[productId] = { name, sales: 0 };
      }
      productSalesMap[productId].sales += item.quantity;
    });

    const topProducts = Object.values(productSalesMap)
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);

    // 2️⃣ Productos sin stock
    const outOfStock = await Product.findAll({
      where: { tenantId, stock: 0 },
      attributes: ['name'],
      limit: 5,
    });
    const formattedOutOfStock = outOfStock.map(p => p.name);

    // 3️⃣ Productos nuevos (últimos 30 días)
    const newProducts = await Product.findAll({
      where: {
        tenantId,
        createdAt: { [Op.gte]: new Date(new Date().setDate(new Date().getDate() - 30)) },
      },
      attributes: ['name'],
      limit: 5,
    });
    const formattedNewProducts = newProducts.map(p => { return { name: p.name, sales: p.stock } });

    // 4️⃣ Ventas totales e ingreso por producto
    const orderItems = await OrderItem.findAll({
      include: [
        {
          model: Product,
          attributes: ['id', 'name'],
          where: { tenantId },
        },
        {
          model: Order,
          attributes: [],
          where: { tenantId, deleted_at: null },
        },
      ],
      where: { deleted_at: null },
    });

    const productIncomeMap: { [key: string]: { name: string; value: number } } = {};

    orderItems.forEach((item: any) => {
      const productId = item.product.id;
      const name = item.product.name;
      if (!productIncomeMap[productId]) {
        productIncomeMap[productId] = { name, value: 0 };
      }
      productIncomeMap[productId].value += item.quantity * item.price; // solo suma
    });

    // Al final, redondear cada valor
    Object.values(productIncomeMap).forEach(p => {
      p.value = parseFloat(p.value.toFixed(2));
    });

    const barData = Object.values(productIncomeMap);

    // Ingreso total para mostrar como texto
    const totalIngreso = Object.values(productIncomeMap).reduce((acc, curr) => acc + Number(curr.value.toFixed(2)), 0);

    // 5️⃣ Productos en oferta
    // const discountedProducts = await Product.findAll({
    //   where: { tenantId, discount: { [Op.gt]: 0 } },
    //   attributes: ['name'],
    //   limit: 5,
    // });
    // const formattedDiscounted = discountedProducts.map(p => p.name);

    // ✅ Respuesta final con la misma estructura que el front
    return [
      {
        title: 'Productos Más Vendidos',
        value: topProducts.length ? topProducts : [{ name: 'Sin ventas', sales: 0 }],
        icon: 'Box',
        type: 'top_products',
      },
      {
        title: 'Productos Sin Stock',
        value: formattedOutOfStock.length ? formattedOutOfStock : ['Todos con stock'],
        icon: 'Box',
        type: 'list',
      },
      {
        title: 'Productos Nuevos',
        value: formattedNewProducts.length ? formattedNewProducts : ['Sin productos nuevos'],
        icon: 'Layers',
        type: 'top_products',
      },
      {
        title: 'Ventas Totales',
        value: barData,
        icon: 'ShoppingCart',
        type: 'bar_chart',
      },
      {
        title: 'Ingreso por producto',
        value: `$${totalIngreso.toLocaleString('es')}`,
        icon: 'CreditCard',
        type: 'text',
      },
      // {
      //   title: 'Productos en Oferta',
      //   value: formattedDiscounted.length ? formattedDiscounted : ['Sin productos en oferta'],
      //   icon: 'Archive',
      //   type: 'list',
      // },
    ];
  }

  async getCustomerMetrics(tenantId: string): Promise<SubMetric[]> {
    // 1️⃣ Clientes más frecuentes (por cantidad de pedidos)
    const orders = await Order.findAll({
      where: { tenantId, deleted_at: null },
      include: [
        {
          model: Customer,
          attributes: ['id', 'name'],
        },
      ],
    });

    const customerOrdersMap: { [key: string]: { name: string; sales: number } } = {};
    orders.forEach((order: any) => {
      const customerId = order.customer?.id;
      const name = order.customer?.name || 'Desconocido';
      if (!customerId) return;
      if (!customerOrdersMap[customerId]) {
        customerOrdersMap[customerId] = { name, sales: 0 };
      }
      customerOrdersMap[customerId].sales += 1;
    });

    const topCustomers = Object.values(customerOrdersMap)
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);

    // 2️⃣ Nuevos clientes (últimos 30 días)
    const newCustomers = await Customer.findAll({
      where: {
        tenantId,
        createdAt: { [Op.gte]: new Date(new Date().setDate(new Date().getDate() - 30)) },
      },
      attributes: ['name'],
      limit: 5,
    });
    const formattedNewCustomers = newCustomers.map(c => c.name);

    // 3️⃣ Clientes con mayor gasto
    const orderItems = await OrderItem.findAll({
      include: [
        {
          model: Order,
          attributes: ['id', 'customerId'],
          where: { tenantId, deleted_at: null },
          include: [{ model: Customer, attributes: ['id', 'name'] }],
        },
      ],
      where: { deleted_at: null },
    });

    const customerSpendingMap: { [key: string]: { name: string; sales: number } } = {};
    orderItems.forEach((item: any) => {
      const customer = item.order?.customer;
      if (!customer) return;
      if (!customerSpendingMap[customer.id]) {
        customerSpendingMap[customer.id] = { name: customer.name, sales: 0 };
      }
      customerSpendingMap[customer.id].sales += Number((item.quantity * item.price).toFixed(2));
    });

    const topSpenders = Object.values(customerSpendingMap)
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5).map((s) => { return { ...s, sales: s.sales.toFixed(2) } });

    // 4️⃣ Gasto promedio por cliente
    const totalSpent = Object.values(customerSpendingMap).reduce((acc, curr) => acc + curr.sales, 0);
    const avgSpent = Object.keys(customerSpendingMap).length
      ? totalSpent / Object.keys(customerSpendingMap).length
      : 0;

    // 5️⃣ Clientes inactivos (sin pedidos en los últimos 60 días)
    const inactiveSince = new Date();
    inactiveSince.setDate(inactiveSince.getDate() - 60);

    const inactiveCustomers = await Customer.findAll({
      where: {
        tenantId,
        // no orders en últimos 60 días
      },
      include: [
        {
          model: Order,
          required: false,
          where: { createdAt: { [Op.gte]: inactiveSince }, deleted_at: null },
        },
      ],
    });

    const formattedInactive = inactiveCustomers
      .filter(c => !c.orders || c.orders.length === 0)
      .map(c => c.name)
      .slice(0, 5);

    // 6️⃣ Retención (muy simplificado: % de clientes que hicieron más de 1 pedido)
    const repeatCustomers = Object.values(customerOrdersMap).filter(c => c.sales > 1).length;
    const retentionRate = Object.keys(customerOrdersMap).length
      ? Math.round((repeatCustomers / Object.keys(customerOrdersMap).length) * 100)
      : 0;

    // ✅ Respuesta final
    return [
      {
        title: 'Clientes Más Frecuentes',
        value: topCustomers.length ? topCustomers : [{ name: 'Sin clientes', sales: 0 }],
        icon: 'Users',
        type: 'top_products',
      },
      {
        title: 'Nuevos Clientes',
        value: formattedNewCustomers.length ? formattedNewCustomers : ['Sin nuevos clientes'],
        icon: 'Users',
        type: 'list',
      },
      {
        title: 'Tasa de Retención',
        value: `${retentionRate}%`,
        icon: 'Layers',
        type: 'text', // 👈 Ojo: antes pusiste `bar_chart` pero debería ser `text`
      },
      {
        title: 'Gasto Promedio por Cliente',
        value: `$${avgSpent.toFixed(2)}`,
        icon: 'CreditCard',
        type: 'text',
      },
      {
        title: 'Clientes con Mayor Gasto',
        value: topSpenders.length ? topSpenders : [{ name: 'Sin clientes', sales: 0 }],
        icon: 'CreditCard',
        type: 'top_products',
      },
      {
        title: 'Clientes Inactivos',
        value: formattedInactive.length ? formattedInactive : ['Sin clientes inactivos'],
        icon: 'Users',
        type: 'list',
      },
    ];
  }

  async getSupplierMetrics(tenantId: string): Promise<SubMetric[]> {
    // 1️⃣ Proveedores principales (por monto comprado)
    const purchases = await Purchase.findAll({
      where: { tenantId, deleted_at: null },
      include: [{ model: Supplier, attributes: ['id', 'name'] }],
    });

    const supplierSpendMap: { [key: string]: { name: string; sales: number } } = {};

    purchases.forEach((purchase: any) => {
      const supplierId = purchase.supplier?.id;
      const name = purchase.supplier?.name || 'Desconocido';
      if (!supplierId) return;
      if (!supplierSpendMap[supplierId]) {
        supplierSpendMap[supplierId] = { name, sales: 0 };
      }
      supplierSpendMap[supplierId].sales += Number(purchase.total || 0);
    });

    const topSuppliers = Object.values(supplierSpendMap)
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);

    // 2️⃣ Proveedores recientes (últimos 60 días creados)
    const recentSuppliers = await Supplier.findAll({
      where: {
        tenantId,
        createdAt: { [Op.gte]: new Date(new Date().setDate(new Date().getDate() - 60)) },
      },
      attributes: ['name'],
      limit: 5,
    });
    const formattedRecent = recentSuppliers.map(s => s.name);

    // 3️⃣ Ciudades con más proveedores
    const suppliersByCity = await Supplier.findAll({
      where: { tenantId },
      attributes: ['city', [fn('COUNT', col('id')), 'count']],
      group: ['city'],
      order: [[literal('count'), 'DESC']],
      limit: 5,
      raw: true,
    });
    const formattedCities = suppliersByCity.map((c: any) => ({
      name: c.city || 'Sin ciudad',
      sales: Number(c.count),
    }));

    // 4️⃣ Contactos de proveedores (email o teléfono)
    const contacts = await Supplier.findAll({
      where: { tenantId },
      attributes: ['name', 'email', 'phone'],
      limit: 5,
    });
    const formattedContacts = contacts.map(c => {
      return `${c.name} (${c.email || c.phone || 'Sin contacto'})`;
    });

    // 5️⃣ Costo promedio por proveedor
    // const avgCostPerSupplier = await Purchase.findOne({
    //   where: { tenantId, deleted_at: null },
    //   attributes: [[fn('AVG', col('total')), 'avgCost']],
    //   raw: true,
    // });
    // const formattedAvgCost = avgCostPerSupplier?.avgCost
    //   ? `$${Number(avgCostPerSupplier.avgCost).toFixed(2)}`
    //   : '$0';

    // ✅ Respuesta final
    return [
      {
        title: 'Proveedores Principales',
        value: topSuppliers.length
          ? topSuppliers
          : [{ name: 'Sin proveedores', sales: 0 }],
        icon: 'Archive',
        type: 'top_sales',
      },
      {
        title: 'Proveedores Recientes',
        value: formattedRecent.length
          ? formattedRecent
          : ['Sin proveedores recientes'],
        icon: 'Users',
        type: 'list',
      },
      {
        title: 'Ciudades con más Proveedores',
        value: formattedCities.length
          ? formattedCities
          : [{ name: 'Sin datos', sales: 0 }],
        icon: 'MapPin',
        type: 'top_products',
      },
      {
        title: 'Contactos de Proveedores',
        value: formattedContacts.length
          ? formattedContacts
          : ['Sin contactos registrados'],
        icon: 'Phone',
        type: 'list',
      },
      // {
      //   title: 'Costo Promedio por Proveedor',
      //   value: formattedAvgCost,
      //   icon: 'CreditCard',
      //   type: 'text',
      // },
    ];
  }

  async getOrderMetrics(tenantId: string): Promise<SubMetric[]> {
    // 1️⃣ Órdenes más grandes
    const topOrders = await Order.findAll({
      where: { tenantId, deleted_at: null },
      attributes: ['id', 'total'],
      order: [['total', 'DESC']],
      limit: 5,
      raw: true,
    });
    const formattedTopOrders = topOrders.map((o: any) => ({
      name: `Orden #${o.id}`,
      sales: Number(o.total).toFixed(2),
    }));

    // 2️⃣ Órdenes pendientes (con cliente)
    const pendingOrders = await Order.findAll({
      where: { tenantId, status: OrderStatus.PENDING, deleted_at: null },
      attributes: ['id'],
      include: [{ model: Customer, attributes: ['name'] }],
      limit: 5,
    });
    const formattedPending = pendingOrders.map(
      (o: any) => [`Orden #${o.id}`, o.customer?.name || 'Sin cliente']
    );

    // 3️⃣ Órdenes completadas (este mes)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    const completedOrders = await Order.findAll({
      where: {
        tenantId,
        status: OrderStatus.COMPLETED,
        deleted_at: null,
        createdAt: { [Op.gte]: startOfMonth },
      },
      attributes: ['id', 'total'],
      raw: true,
    });
    const formattedCompleted = `${completedOrders.length} este mes`;

    // 4️⃣ Ventas totales por orden (bar_chart)
    const salesBarData = completedOrders.map((o: any) => ({
      name: `Orden #${o.id}`,
      value: Number(o.total).toFixed(2),
    }));

    // 5️⃣ Ventas totales del año
    const startOfYear = new Date(new Date().getFullYear(), 0, 1);
    const yearlyOrders = await Order.findAll({
      where: { tenantId, status: OrderStatus.COMPLETED, deleted_at: null, createdAt: { [Op.gte]: startOfYear } },
      attributes: ['total'],
      raw: true,
    });
    const totalYearlySales = yearlyOrders.reduce((acc, o: any) => acc + Number(o.total), 0);
    const formattedYearlySales = `$${totalYearlySales.toLocaleString('es')} este año`;

    return [
      {
        title: 'Órdenes Más Grandes',
        value: formattedTopOrders.length ? formattedTopOrders : [{ name: 'Sin órdenes', sales: 0 }],
        icon: 'ShoppingCart',
        type: 'top_products',
      },
      {
        title: 'Órdenes Pendientes',
        value: formattedPending.length ? formattedPending : ['Sin órdenes pendientes'],
        icon: 'ShoppingCart',
        type: 'list2',
      },
      {
        title: 'Ventas Totales del Año',
        value: formattedYearlySales,
        icon: 'CreditCard',
        type: 'text',
      },
      {
        title: 'Ventas Totales',
        value: salesBarData.length ? salesBarData : [],
        icon: 'ShoppingCart',
        type: 'bar_chart',
      },
      {
        title: 'Órdenes Completadas',
        value: formattedCompleted,
        icon: 'Archive',
        type: 'text',
      },
    ];
  }

  async getPurchaseMetrics(tenantId: string): Promise<SubMetric[]> {
    // 1️⃣ Compras más recientes (top 5 por total)
    const recentPurchases = await Purchase.findAll({
      where: { tenantId, deleted_at: null },
      include: [{ model: Supplier, attributes: ['name'] }],
      order: [['date', 'DESC']],
      limit: 5,
      attributes: ['id', 'total', 'supplierId'],
      raw: true,
    });
    const formattedRecent = recentPurchases.map((p: any) => ({
      name: `Compra #${p.id}`,
      sales: Number(p.total),
    }));

    // 2️⃣ Compras recurrentes (mismo proveedor >1 compra)
    const purchaseMap: { [supplierId: string]: number[] } = {};
    recentPurchases.forEach((p: any) => {
      if (!p.supplierId) return;
      if (!purchaseMap[p.supplierId]) purchaseMap[p.supplierId] = [];
      purchaseMap[p.supplierId].push(p.id);
    });
    const recurrentPurchases = Object.values(purchaseMap)
      .filter((arr) => arr.length > 1)
      .flat()
      .slice(0, 5)
      .map((id) => `Compra #${id}`);

    // 3️⃣ Ahorros por descuentos (sumatoria de descuentos de todas las compras este mes)
    // Si no hay campo descuento, se puede omitir o usar total como referencia
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    const purchasesThisMonth = await Purchase.findAll({
      where: { tenantId, deleted_at: null, date: { [Op.gte]: startOfMonth } },
      attributes: ['id', 'total'],
      raw: true,
    });
    const savingsBarData = purchasesThisMonth.map((p: any) => ({
      name: `Compra #${p.id}`,
      value: Number(p.total), // reemplazar por descuento si existe
    }));

    // 4️⃣ Compras totales del año
    const startOfYear = new Date(new Date().getFullYear(), 0, 1);
    const yearlyPurchases = await Purchase.findAll({
      where: { tenantId, deleted_at: null, date: { [Op.gte]: startOfYear } },
      attributes: ['total'],
      raw: true,
    });
    const totalYearlyPurchases = yearlyPurchases.reduce((acc, p: any) => acc + Number(p.total), 0);
    const formattedYearlyPurchases = `$${totalYearlyPurchases.toLocaleString('es')} este año`;

    // 5️⃣ Proveedores de compras (únicos de las últimas compras)
    const suppliers = await Supplier.findAll({
      where: { tenantId },
      include: [{ model: Purchase, attributes: ['id'], required: true }],
      attributes: ['name'],
      group: ['Supplier.id'],
      limit: 5,
    });
    const formattedSuppliers = suppliers.map((s) => s.name);

    return [
      {
        title: 'Compras Más Recientes',
        value: formattedRecent.length ? formattedRecent : [{ name: 'Sin compras', sales: 0 }],
        icon: 'CreditCard',
        type: 'top_products',
      },
      {
        title: 'Compras Recurrentes',
        value: recurrentPurchases.length ? recurrentPurchases : ['Sin compras recurrentes'],
        icon: 'ShoppingCart',
        type: 'list',
      },
      {
        title: 'Compras Totales del Año',
        value: formattedYearlyPurchases,
        icon: 'CreditCard',
        type: 'text',
      },
      {
        title: 'Totales por Compra',
        value: savingsBarData.length ? savingsBarData : [],
        icon: 'Layers',
        type: 'bar_chart',
      },
      {
        title: 'Proveedores de Compras',
        value: formattedSuppliers.length ? formattedSuppliers : ['Sin proveedores'],
        icon: 'Archive',
        type: 'list',
      },
    ];
  }

  async getCategoryMetrics(tenantId: string): Promise<SubMetric[]> {
    // Traer todas las categorías con sus productos
    const categories = await Category.findAll({
      where: { tenantId },
      include: [{ model: Product, attributes: ['id', 'price', 'stock'] }],
    });

    // Map para guardar métricas de cada categoría
    const metrics = await Promise.all(
      categories.map(async (cat: any) => {
        // Calcular ventas y revenue para cada producto
        let totalSales = 0;
        let revenue = 0;

        if (cat.products && cat.products.length > 0) {
          for (const product of cat.products) {
            const soldItems = await OrderItem.findAll({
              where: { productId: product.id },
              include: [
                {
                  model: Order,
                  where: { tenantId, status: OrderStatus.COMPLETED, deleted_at: null },
                  attributes: [],
                },
              ],
              attributes: ['quantity', 'price'],
              raw: true,
            });

            const productSales = soldItems.reduce(
              (sum: number, item: any) => sum + Number(item.quantity),
              0
            );
            const productRevenue = soldItems.reduce(
              (sum: number, item: any) => sum + Number(item.quantity) * Number(item.price),
              0
            );

            totalSales += productSales;
            revenue += productRevenue;
          }
        }

        const lowStock = cat.products?.some((p: any) => p.stock < 5);

        return {
          id: cat.id,
          name: cat.name,
          totalSales,
          revenue,
          hasLowStock: lowStock,
          productsCount: cat.products?.length || 0,
        };
      })
    );

    // Ordenar y filtrar para cada sección
    const topCategories = metrics
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, 5);

    const activeCategories = metrics
      .filter((c) => c.productsCount > 0)
      .map((c) => c.name)
      .slice(0, 5);

    const lowStockCategories = metrics
      .filter((c) => c.hasLowStock)
      .map((c) => c.name)
      .slice(0, 5);

    const salesBarData = metrics.map((c) => ({ name: c.name, value: c.totalSales }));
    const revenueBarData = metrics.map((c) => ({ name: c.name, value: c.revenue.toFixed(2) }));

    const avgProducts =
      metrics.length > 0
        ? metrics.reduce((sum, c) => sum + c.productsCount, 0) / metrics.length
        : 0;

    // Respuesta final en formato SubMetric[]
    return [
      {
        title: 'Categorías Más Populares',
        value:
          topCategories.length > 0
            ? topCategories.map((c) => ({ name: c.name, sales: c.totalSales }))
            : [{ name: 'Sin categorías', sales: 0 }],
        icon: 'Layers',
        type: 'top_products',
      },
      {
        title: 'Ventas por Categoría',
        value: salesBarData.length > 0 ? salesBarData : [],
        icon: 'Box',
        type: 'bar_chart',
      },
      {
        title: 'Categorías Activas',
        value: activeCategories.length > 0 ? activeCategories : ['Sin categorías activas'],
        icon: 'Layers',
        type: 'list',
      },
      {
        title: 'Productos por Categoría',
        value: `Promedio: ${avgProducts.toFixed(1)} productos`,
        icon: 'Archive',
        type: 'text',
      },
      {
        title: 'Categorías con Bajo Stock',
        value: lowStockCategories.length > 0 ? lowStockCategories : ['Sin categorías con bajo stock'],
        icon: 'ShoppingCart',
        type: 'list',
      },
      {
        title: 'Ingresos por Categoría',
        value: revenueBarData.length > 0 ? revenueBarData : [],
        icon: 'CreditCard',
        type: 'bar_chart',
      },
    ];
  }

}