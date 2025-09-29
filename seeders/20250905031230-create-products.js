'use strict';
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    // Buscar tenant cliente
    const [clientTenant] = await queryInterface.sequelize.query(
      `SELECT id FROM "Tenants" WHERE name = 'ClientTenant' LIMIT 1;`
    );

    if (!clientTenant.length) {
      throw new Error('No se encontró el Client Tenant, corre primero el seed de tenants');
    }

    const tenant_id = clientTenant[0].id;

    // Crear categorías de ejemplo
    const categories = [
      { id: uuidv4(), name: 'Electrónica', tenant_id, created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), name: 'Ropa', tenant_id, created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), name: 'Hogar', tenant_id, created_at: new Date(), updated_at: new Date() },
    ];

    await queryInterface.bulkInsert('Categories', categories);

    // Crear productos vinculados al tenant
    const products = [
      {
        id: uuidv4(),
        tenant_id,
        name: 'Smartphone Pro',
        description: 'Un smartphone de última generación con pantalla OLED.',
        price: 899.99,
        stock: 50,
        sku: 'ELEC-001',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        tenant_id,
        name: 'Camiseta Deportiva',
        description: 'Camiseta ligera y transpirable para deportes.',
        price: 29.99,
        stock: 200,
        sku: 'CLOT-001',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        tenant_id,
        name: 'Lámpara de Mesa',
        description: 'Lámpara de mesa moderna con luz cálida.',
        price: 49.99,
        stock: 80,
        sku: 'HOME-001',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    await queryInterface.bulkInsert('Products', products);

    // Insertar en tabla intermedia ProductCategories
    const productCategories = [
      { product_id: products[0].id, category_id: categories[0].id},
      { product_id: products[1].id, category_id: categories[1].id},
      { product_id: products[2].id, category_id: categories[2].id},
    ];

    await queryInterface.bulkInsert('CategoryProducts', productCategories);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('CategoryProducts', null, {});
    await queryInterface.bulkDelete('Products', null, {});
    await queryInterface.bulkDelete('Categories', null, {});
  },
};
