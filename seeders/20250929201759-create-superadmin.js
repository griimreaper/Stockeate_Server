'use strict';
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    const superTenantId = uuidv4();

    // Crear Tenant SuperAdmin
    const tenants = [
      {
        id: superTenantId,
        name: 'SuperAdmin Tenant',
        domain: 'superadmin.stocker.com',
        contact_email: 'contact@superadmin.com',
        customization: JSON.stringify({
          primaryColor: '#000000',
          secondaryColor: '#ffffff',
          iconColor: '#000000',
          logoUrl: '/icon.png',
        }),
        phone: '+541112223333',
        is_active: true,
        plan: 'superadmin',
        subscription_start: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    // Crear Usuario SuperAdmin con tu mail
    const superPasswordHash = await bcrypt.hash('SuperAdmin123!', 10);
    const users = [
      {
        id: uuidv4(),
        tenant_id: superTenantId,
        name: 'Super Admin',
        email: 'leonelbehnke@gmail.com', // 👈 tu mail
        password: superPasswordHash,
        role: 'superadmin',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    ];

    // Insertar en BD
    await queryInterface.bulkInsert('Tenants', tenants);
    await queryInterface.bulkInsert('Users', users);
  },

  async down(queryInterface, Sequelize) {
    // Eliminar usuario SuperAdmin
    await queryInterface.bulkDelete('Users', {
      email: 'leonelbehnke@gmail.com',
    });

    // Eliminar Tenant SuperAdmin
    await queryInterface.bulkDelete('Tenants', {
      name: 'SuperAdmin Tenant',
    });
  },
};
