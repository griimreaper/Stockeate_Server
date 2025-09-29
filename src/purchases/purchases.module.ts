import { forwardRef, Module } from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { PurchasesController } from './purchases.controller';
import { Purchase } from './entities/purchase.entity';
import { SequelizeModule } from '@nestjs/sequelize';
import { PurchaseItem } from 'src/purchase-items/entities/purchase-item.entity';
import { ProductsModule } from 'src/products/products.module';
import { SuppliersModule } from 'src/suppliers/suppliers.module';

@Module({
  imports: [
    SequelizeModule.forFeature([Purchase, PurchaseItem]),
    SuppliersModule,
    forwardRef(() => ProductsModule)
  ],
  controllers: [PurchasesController],
  providers: [PurchasesService],
  exports: [SequelizeModule, PurchasesService]
})
export class PurchasesModule { }
