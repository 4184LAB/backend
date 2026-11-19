import { Controller, Get, Header, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { FileDownloadGuard } from './file-download.guard';
import { FileService } from './file.service';

@Controller({ path: 'files', version: '1' })
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Get('download')
  @UseGuards(FileDownloadGuard)
  @Header('Cache-Control', 'no-store')
  async download(
    @Query('filename') filename: string,
    @Res() response: Response,
  ) {
    const file = await this.fileService.download(filename);
    return response.download(file.path, file.name);
  }
}
