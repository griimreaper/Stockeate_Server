import { Test, TestingModule } from '@nestjs/testing';
import { VercelBlobService } from '../vercel-storage.service';

describe('VercelBlobService', () => {
  let service: VercelBlobService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VercelBlobService],
    }).compile();

    service = module.get<VercelBlobService>(VercelBlobService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
