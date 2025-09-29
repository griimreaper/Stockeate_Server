import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PurchaseItemsService } from './purchase-items.service';
import { CreatePurchaseItemDto } from './dto/create-purchase-item.dto';
import { UpdatePurchaseItemDto } from './dto/update-purchase-item.dto';

@Controller('purchase-items')
export class PurchaseItemsController {
  constructor(private readonly purchaseItemsService: PurchaseItemsService) {}

  @Post()
  create(@Body() createPurchaseItemDto: CreatePurchaseItemDto) {
    return this.purchaseItemsService.create(createPurchaseItemDto);
  }

  @Get()
  findAll() {
    return this.purchaseItemsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.purchaseItemsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePurchaseItemDto: UpdatePurchaseItemDto) {
    return this.purchaseItemsService.update(+id, updatePurchaseItemDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.purchaseItemsService.remove(+id);
  }
}
