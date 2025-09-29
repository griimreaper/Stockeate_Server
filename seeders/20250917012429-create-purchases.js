'use strict';
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    // Obtener el tenant 'ClientTenant'
    const [clientTenant] = await queryInterface.sequelize.query(
      `SELECT id FROM "Tenants" WHERE name = 'ClientTenant' LIMIT 1;`
    );

    if (!clientTenant.length) {
      throw new Error('No se encontró el Client Tenant, corre primero el seed de tenants');
    }

    const tenantId = clientTenant[0].id;

    // Obtener proveedores del tenant
    const [suppliers] = await queryInterface.sequelize.query(
      `SELECT id FROM "Suppliers" WHERE tenant_id = '${tenantId}';`
    );

    if (!suppliers.length) {
      throw new Error('No se encontraron proveedores para el tenant');
    }

    // Obtener productos del tenant
    const [products] = await queryInterface.sequelize.query(
      `SELECT id, price FROM "Products" WHERE tenant_id = '${tenantId}';`
    );

    if (!products.length) {
      throw new Error('No se encontraron productos para el tenant');
    }

    const purchases = [];
    const purchaseItems = [];

    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

    suppliers.forEach((supplier) => {
      // Crear 3 a 10 compras por proveedor
      const purchaseCount = Math.floor(Math.random() * 8) + 3;

      for (let i = 0; i < purchaseCount; i++) {
        const purchaseId = uuidv4();
        const randomDays = Math.floor(Math.random() * 28);
        const date = new Date(fourWeeksAgo);
        date.setDate(date.getDate() + randomDays);
        let total = 0;

        // Seleccionar 1 a 3 productos aleatorios por compra
        const shuffled = products.sort(() => 0.5 - Math.random());
        const selectedProducts = shuffled.slice(0, Math.floor(Math.random() * 3) + 1);

        selectedProducts.forEach((p) => {
          const quantity = Math.floor(Math.random() * 5) + 1;
          total += p.price * quantity;

          purchaseItems.push({
            id: uuidv4(),
            purchase_id: purchaseId,
            product_id: p.id,
            quantity,
            price: p.price,
            created_at: date,
            updated_at: date,
          });
        });

        purchases.push({
          id: purchaseId,
          tenant_id: tenantId,
          supplier_id: supplier.id,
          date,
          total,
          created_at: date,
          updated_at: date,
        });
      }
    });

    // Insertar compras
    await queryInterface.bulkInsert('Purchases', purchases);
    // Insertar ítems de compras
    await queryInterface.bulkInsert('PurchaseItems', purchaseItems);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('PurchaseItems', null, {});
    await queryInterface.bulkDelete('Purchases', null, {});
  },
};