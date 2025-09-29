'use strict';
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    // Lista de colores para personalización
    const colorPalettes = [
      { primaryColor: '#1d4ed8', secondaryColor: '#ffffff', iconColor: '#1d4ed8', logoUrl: '/icon1.png' },
      { primaryColor: '#047857', secondaryColor: '#ecfdf5', iconColor: '#047857', logoUrl: '/icon2.png' },
    ];

    // Lista de nombres de tenants
    const tenantNames = ['TechCorp', 'ClientTenant'];

    // Generar tenants
    const tenants = [];
    const users = [];

    // 1️⃣ Crear Tenant SuperAdmin
    const superTenantId = uuidv4();
    tenants.push({
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
    });

    // Crear Usuario SuperAdmin
    const superPasswordHash = await bcrypt.hash('SuperAdmin123!', 10);
    users.push({
      id: uuidv4(),
      tenant_id: superTenantId,
      name: 'Super Admin',
      email: 'superadmin@stocker.com',
      password: superPasswordHash,
      role: 'superadmin',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    });

    // 2️⃣ Crear Tenants de Clientes
    for (let i = 0; i < tenantNames.length; i++) {
      const tenantId = uuidv4();
      const tenantName = tenantNames[i];
      const colorPalette = colorPalettes[i % colorPalettes.length]; // Ciclar colores si hay más tenants que colores

      tenants.push({
        id: tenantId,
        name: tenantName,
        domain: `${tenantName.toLowerCase()}.stocker.com`,
        contact_email: `contact@${tenantName.toLowerCase()}.com`,
        customization: JSON.stringify(colorPalette),
        phone: `+5411998877${String(i + 1).padStart(2, '0')}`,
        is_active: Math.random() > 0.1, // 90% de probabilidad de estar activo
        plan: Math.random() > 0.5 ? 'monthly' : 'free', // 50% free, 50% monthly
        subscription_start: new Date(),
        subscription_end: Math.random() > 0.7 ? null : new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Crear Usuario Admin para cada tenant
      const adminPasswordHash = await bcrypt.hash(`Admin123!`, 10);
      users.push({
        id: uuidv4(),
        tenant_id: tenantId,
        name: `${tenantName} Admin`,
        email: `admin@${tenantName.toLowerCase()}.com`,
        password: adminPasswordHash,
        role: 'admin',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      });
    }

    // 3️⃣ Insertar tenants
    await queryInterface.bulkInsert('Tenants', tenants);

    // 4️⃣ Insertar usuarios
    await queryInterface.bulkInsert('Users', users);
  },

  async down(queryInterface, Sequelize) {
    // Eliminar usuarios
    await queryInterface.bulkDelete('Users', {
      email: [
        'superadmin@stocker.com',
        ...tenantNames.map(name => `admin@${name.toLowerCase()}.com`),
      ],
    });

    // Eliminar tenants
    await queryInterface.bulkDelete('Tenants', {
      name: ['SuperAdmin Tenant', ...tenantNames],
    });
  },
};