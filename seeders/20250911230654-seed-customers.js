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

    // Crear customers de ejemplo vinculados al tenant cliente
    const customers = [
      {
        id: uuidv4(),
        tenant_id,
        name: 'Juan Pérez',
        email: 'juan.perez@example.com',
        phone: '+54 9 11 5555 1111',
        city: 'Buenos Aires',
        country: 'Argentina',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        tenant_id,
        name: 'María González',
        email: 'maria.gonzalez@example.com',
        phone: '+34 600 123 456',
        city: 'Madrid',
        country: 'España',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        tenant_id,
        name: 'John Smith',
        email: 'john.smith@example.com',
        phone: '+1 202 555 0198',
        city: 'New York',
        country: 'USA',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    await queryInterface.bulkInsert('Customers', customers);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Customers', null, {});
  },
};
