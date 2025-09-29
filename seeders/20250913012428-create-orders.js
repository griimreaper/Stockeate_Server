'use strict';
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1️⃣ Obtener tenant
    const [clientTenant] = await queryInterface.sequelize.query(
      `SELECT id FROM "Tenants" WHERE name = 'ClientTenant' LIMIT 1;`
    );

    if (!clientTenant.length) {
      throw new Error('No se encontró el Client Tenant, corre primero el seed de tenants');
    }

    const tenant_id = clientTenant[0].id;

    // 2️⃣ Obtener clientes del tenant
    const [customers] = await queryInterface.sequelize.query(
      `SELECT id FROM "Customers" WHERE tenant_id = '${tenant_id}';`
    );

    if (!customers.length) {
      throw new Error('No se encontraron clientes para el tenant');
    }

    // 3️⃣ Obtener usuarios del tenant
    const [users] = await queryInterface.sequelize.query(
      `SELECT id FROM "Users" WHERE tenant_id = '${tenant_id}';`
    );

    if (!users.length) {
      throw new Error('No se encontraron usuarios para el tenant');
    }

    // 4️⃣ Obtener productos del tenant
    const [products] = await queryInterface.sequelize.query(
      `SELECT id, price FROM "Products" WHERE tenant_id = '${tenant_id}';`
    );

    if (!products.length) {
      throw new Error('No se encontraron productos para el tenant');
    }

    // 5️⃣ Crear órdenes
    const orders = [];
    const orderItems = [];

    // Generar fechas en las últimas 4 semanas
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

    customers.forEach((customer) => {
      // Crear 3 a 10 órdenes por cliente (para generar más datos)
      const orderCount = Math.floor(Math.random() * 8) + 3; // Entre 3 y 10 órdenes

      for (let i = 0; i < orderCount; i++) {
        const orderId = uuidv4();
        // Generar fecha aleatoria entre hace 4 semanas y ahora
        const randomDays = Math.floor(Math.random() * 28); // 0 a 27 días
        const orderDate = new Date(fourWeeksAgo);
        orderDate.setDate(orderDate.getDate() + randomDays);
        let total = 0;

        // Seleccionar 1 a 3 productos aleatorios por orden
        const shuffled = products.sort(() => 0.5 - Math.random());
        const selectedProducts = shuffled.slice(0, Math.floor(Math.random() * 3) + 1);

        selectedProducts.forEach((p) => {
          const quantity = Math.floor(Math.random() * 5) + 1;
          total += p.price * quantity;

          orderItems.push({
            id: uuidv4(),
            order_id: orderId,
            product_id: p.id,
            quantity,
            price: p.price,
            created_at: orderDate,
            updated_at: orderDate,
          });
        });

        orders.push({
          id: orderId,
          tenant_id,
          user_id: users[Math.floor(Math.random() * users.length)].id, // Usuario aleatorio
          customer_id: customer.id,
          status: Math.random() > 0.3 ? 'completed' : 'pending', // 70% completadas
          order_date: orderDate,
          total,
          created_at: orderDate,
          updated_at: orderDate,
        });
      }
    });

    // 6️⃣ Insertar órdenes
    await queryInterface.bulkInsert('Orders', orders);

    // 7️⃣ Insertar items de órdenes
    await queryInterface.bulkInsert('OrderItems', orderItems);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('OrderItems', null, {});
    await queryInterface.bulkDelete('Orders', null, {});
  },
};