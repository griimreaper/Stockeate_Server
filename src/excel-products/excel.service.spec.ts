import { Test, TestingModule } from '@nestjs/testing';
import { ExcelProductsService } from './excel-products.service';

describe('ExcelProductsService', () => {
  let service: ExcelProductsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExcelProductsService],
    }).compile();

    service = module.get<ExcelProductsService>(ExcelProductsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
