import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { Order } from './entities/order.entity';
import { SequelizeModule } from '@nestjs/sequelize';
import { OrderItem } from 'src/order-items/entities/order-item.entity';
import { Product } from 'src/products/entities/product.entity';
import { Customer } from 'src/customers/entities/customer.entity';

@Module({
  imports: [SequelizeModule.forFeature([Order, OrderItem, Product, Customer])],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService]
})
export class OrdersModule { }
