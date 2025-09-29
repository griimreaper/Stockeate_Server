import { Controller, Delete, Param, Post, Query, UploadedFile, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { VercelBlobService } from './vercel-storage.service';

@Controller('files')
export class FilesController {
  constructor(private readonly vercelBlobService: VercelBlobService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
  @UploadedFile() file: Express.Multer.File,
    @Query('path') path: string,
  ) {
    const result = await this.vercelBlobService.uploadImage(file, path);
    return {
      secure_url: result,
    };
  }

  @Delete('delete')
  async deleteFile(
  @Query('url') url: string,
  ) {
    return this.vercelBlobService.deleteImage(url);
  }

  // @Delete('deleteAll')
  // async deleteAllFiles(
  // ) {
  //   return this.vercelBlobService.deleteAll();
  // }

  @Post('uploadFolderPath')
  @UseInterceptors(FilesInterceptor('files'))
  async uploadFolderPath(
  @UploadedFiles() files: Express.Multer.File[],
    @Query('folderName') folderName: string,
  ) {
    const urls = await this.vercelBlobService.uploadFolderPath(files, folderName);
    return urls;
  }

}