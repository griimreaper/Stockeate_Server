import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProductsModule } from './products/products.module';
import { CustomersModule } from './customers/customers.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { CategoriesModule } from './categories/categories.module';
import { OrdersModule } from './orders/orders.module';
import { OrderItemsModule } from './order-items/order-items.module';
import { PurchasesModule } from './purchases/purchases.module';
import { PurchaseItemsModule } from './purchase-items/purchase-items.module';
import { TenantsModule } from './tenants/tenants.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { ConfigModule } from '@nestjs/config';
import { FilesModule } from './files/files.module';
import { ExcelModule } from './excel-products/excel.module';
import { ScheduleModule } from '@nestjs/schedule';
import { PaymentsService } from './payments/payments.service';
import { PaymentsController } from './payments/payments.controller';
import { MailModule } from './mailer/mailer.module';

@Module({
  imports: [
    ProductsModule,
    CustomersModule,
    SuppliersModule,
    CategoriesModule,
    OrdersModule,
    OrderItemsModule,
    PurchasesModule,
    PurchaseItemsModule,
    TenantsModule,
    UsersModule,
    AuthModule,
    DatabaseModule,
    FilesModule,
    ConfigModule.forRoot(),
    ScheduleModule.forRoot(),
    ExcelModule,
    MailModule
  ],
  controllers: [AppController, PaymentsController],
  providers: [AppService, PaymentsService],
})
export class AppModule { }
