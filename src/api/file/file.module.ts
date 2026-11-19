import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../../database/prisma.module';
import { FileController } from './file.controller';
import { FileDownloadGuard } from './file-download.guard';
import { FileService } from './file.service';

@Module({
  imports: [PrismaModule, PassportModule.register({ session: false })],
  controllers: [FileController],
  providers: [FileService, FileDownloadGuard],
  exports: [FileService],
})
export class FileModule {}
