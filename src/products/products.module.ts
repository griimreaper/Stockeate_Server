import { forwardRef, Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { Product } from './entities/product.entity';
import { SequelizeModule } from '@nestjs/sequelize';
import { CategoriesModule } from 'src/categories/categories.module';
import { SuppliersModule } from 'src/suppliers/suppliers.module';
import { PurchasesModule } from 'src/purchases/purchases.module';
import { FilesModule } from 'src/files/files.module';

@Module({
  imports: [
    SequelizeModule.forFeature([Product]),
    forwardRef(() => PurchasesModule),
    SuppliersModule,
    CategoriesModule,
    FilesModule,
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [SequelizeModule, ProductsService]
})
export class ProductsModule { }
