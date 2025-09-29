import { Module } from '@nestjs/common';
import { ExcelController } from './excel.controller';
import { ExcelService } from './excel.service';
import { CustomersModule } from 'src/customers/customers.module';
import { ProductsModule } from 'src/products/products.module';
import { PurchasesModule } from 'src/purchases/purchases.module';
import { CategoriesModule } from 'src/categories/categories.module';
import { SuppliersModule } from 'src/suppliers/suppliers.module';
import { OrdersModule } from 'src/orders/orders.module';

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
