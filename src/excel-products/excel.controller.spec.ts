import { Test, TestingModule } from '@nestjs/testing';
import { ExcelProductsController } from './excel-products.controller';
import { ExcelProductsService } from './excel-products.service';

describe('ExcelProductsController', () => {
  let controller: ExcelProductsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExcelProductsController],
      providers: [ExcelProductsService],
    }).compile();

    controller = module.get<ExcelProductsController>(ExcelProductsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
