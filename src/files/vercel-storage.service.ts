// vercel-blob.service.ts
import { Injectable } from '@nestjs/common';
import { put, del, list } from '@vercel/blob';
import { BLOB_READ_WRITE_TOKEN } from '../config/enviroments';

@Injectable()
export class VercelBlobService {
  private readonly token: string;

  constructor(
  ) {
    this.token = BLOB_READ_WRITE_TOKEN;
  }

  async uploadImage(file: Express.Multer.File, title: string): Promise<any> {
    try {
      const filePath = `${title}/${file.originalname}`;
      const { url } = await put(filePath, file.buffer, {
        access: 'public',
        token: this.token,
        allowOverwrite: true,
      });

      return url;
    } catch (error) {
      throw new Error(`Error uploading image: ${error.message}`);
    }
  }

  async uploadBuffer(buffer: Buffer, title: string, filename: string): Promise<string> {
    try {
      const filePath = `${title}/${filename}`;

      const { url } = await put(filePath, buffer, {
        access: 'public',
        token: this.token,
        allowOverwrite: true,
      });

      return url;
    } catch (error: any) {
      throw new Error(`Error uploading buffer: ${error.message || error}`);
    }
  }

  async uploadFolderPath(files: Express.Multer.File[], pat: string): Promise<string[]> {
    try {
      const urls: string[] = [];

      for (const file of files) {
        const filePath = `${pat}/${file.originalname}`;
        const { url } = await put(filePath, file.buffer, {
          access: 'public',
          token: this.token,
        });
        urls.push(url);
      }

      return urls;
    } catch (error) {
      throw new Error(`Error uploading folder: ${error.message}`);
    }
  }


  async deleteImage(imageUrl: string): Promise<any> {
    try {
      console.log(imageUrl);

      const response = await del(imageUrl, {
        token: this.token,
      });

      return response;
    } catch (error) {
      throw new Error(`Error deleting image: ${error.message}`);
    }
  }

  async renameFolder(oldTitle: string, newTitle: string): Promise<void> {
    try {
      const { blobs } = await list({
        prefix: `Products/${oldTitle}/`,
        token: this.token,
      });

      for (const blob of blobs) {
        const oldBlobUrl = blob.url;
        const newBlobUrl = oldBlobUrl.replace(
          `Products/${oldTitle.split(' ').join('%20')}/`,
          `Products/${newTitle.split(' ').join('%20')}/`,
        );

        const oldblob = await this.getBlobBuffer(oldBlobUrl);
        // Copy the blob to the new location
        await put(
          newBlobUrl.split('/').splice(3).join('/'),
          oldblob,
          {
            access: 'public',
            token: this.token,
          },
        );

        // Delete the old blob
        await this.clearFolder(oldTitle);
      }
    } catch (error) {
      console.error(
        `Error renaming folder from ${oldTitle} to ${newTitle}: ${error.message}`,
      );
      throw new Error(`Error renaming folder: ${error.message}`);
    }
  }

  private async getBlobBuffer(blobUrl: string): Promise<Buffer> {
    // Fetch the blob content as a buffer
    const response = await fetch(blobUrl);
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async clearFolder(folderName: string): Promise<void> {
    try {
      if (!this.token) {
        throw new Error('Token is not initialized.');
      }

      const { blobs } = await list({
        prefix: `Products/${folderName}/`,
        token: this.token,
      });

      await Promise.all(
        blobs.map(async (blob) => {
          try {
            await del(blob.url, {
              token: this.token,
            });
          } catch (error) {
            console.error(`Error deleting blob ${blob.url}: ${error.message}`);
            throw error;
          }
        }),
      );
    } catch (error) {
      console.error(`Error clearing folder: ${error.message}`);
      throw new Error(`Error clearing folder: ${error.message}`);
    }
  }
}
