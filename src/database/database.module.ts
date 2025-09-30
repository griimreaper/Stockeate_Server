import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import * as env from '../config/enviroments';
import { User } from '../users/entities/user.entity';
import { Product } from '../products/entities/product.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../order-items/entities/order-item.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { Purchase } from '../purchases/entities/purchase.entity';
import { Category } from '../categories/entities/category.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { PurchaseItem } from 'src/purchase-items/entities/purchase-item.entity';
import { CategoryProduct } from 'src/categories/entities/categoryProducts.entity';

@Module({
  imports: [
    SequelizeModule.forRoot({
      dialect: 'postgres',
      dialectModule: require('pg'),
      host: env.DPHOST,
      port: Number(env.DBPORT),
      username: env.DPUSERNAME,
      password: env.DPPASSWORD,
      database: env.DPDATABASE,
      models: [
        User,
        Product,
        CategoryProduct,
        Order,
        OrderItem,
        Customer,
        Supplier,
        Purchase,
        PurchaseItem,
        Category,
        Tenant,
      ],
      ssl: true,
      dialectOptions: {
        ssl: {
          rejectUnauthorized: true,
        },
      },
      autoLoadModels: true,
      synchronize: true,
      logging: false,
      sync: { force: false }, // Solo para desarrollo; en producción usar migraciones
    }),
  ],
  exports: [SequelizeModule],
})
export class DatabaseModule { }
