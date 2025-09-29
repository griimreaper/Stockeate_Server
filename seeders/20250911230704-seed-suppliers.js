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

    // Crear suppliers de ejemplo vinculados al tenant cliente
    const suppliers = [
      {
        id: uuidv4(),
        tenant_id,
        name: 'Proveedor A',
        email: 'proveedora@example.com',
        phone: '+54 11 1111-1111',
        city: 'Buenos Aires',
        address: 'Calle Falsa 123',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        tenant_id,
        name: 'Proveedor B',
        email: 'proveedorb@example.com',
        phone: '+54 11 2222-2222',
        city: 'Córdoba',
        address: 'Av. Siempre Viva 742',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        tenant_id,
        name: 'Proveedor C',
        email: 'proveedorc@example.com',
        phone: '+54 11 3333-3333',
        city: 'Rosario',
        address: 'San Martín 456',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]

    await queryInterface.bulkInsert('Suppliers', suppliers);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Suppliers', null, {});
  },
};
