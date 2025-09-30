import { Module } from '@nestjs/common';
import { ExcelController } from './excel.controller';
import { ExcelService } from './excel.service';
import { CustomersModule } from '../customers/customers.module';
import { ProductsModule } from '../products/products.module';
import { PurchasesModule } from '../purchases/purchases.module';
import { CategoriesModule } from '../categories/categories.module';
import { SuppliersModule } from '../suppliers/suppliers.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [
    PurchasesModule,
    CustomersModule,
    ProductsModule,
    CategoriesModule,
    SuppliersModule,
    OrdersModule,
  ],
  controllers: [ExcelController],
  providers: [ExcelService],
})
export class ExcelModule { }
