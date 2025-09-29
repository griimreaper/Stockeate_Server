import { Module } from '@nestjs/common';
import { FilesController } from './files.controller';
import { VercelBlobService } from './vercel-storage.service';
import { MulterModule } from '@nestjs/platform-express';

@Module({
  imports: [MulterModule.register()],
  controllers: [FilesController],
  providers: [VercelBlobService],
  exports: [VercelBlobService],
})
export class FilesModule { }
