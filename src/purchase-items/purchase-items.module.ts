import { Module } from '@nestjs/common';
import { PurchaseItemsService } from './purchase-items.service';
import { PurchaseItemsController } from './purchase-items.controller';

@Module({
  controllers: [PurchaseItemsController],
  providers: [PurchaseItemsService],
})
export class PurchaseItemsModule {}
