import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BoardType } from '@prisma/client';
import { User } from '../../common/decorators/user.decorator';
import type { RequestUser } from '../../common/decorators/user.decorator';
import { ZodValidationPipe } from '../../common/pipe/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/jwt/jwt.guard';
import { boardSchema } from './schema/board.schema';
import type { BoardSchema } from './schema/board.schema';
import { BoardService } from './board.service';
import { FileService } from '../file/file.service';

@Controller({ path: 'notices', version: '1' })
export class NoticeController {
  constructor(
    private readonly boardService: BoardService,
    private readonly fileService: FileService,
  ) {}

  @Get()
  findAll() {
    return this.boardService.findAll(BoardType.NOTICE);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.boardService.findOne(BoardType.NOTICE, id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @User() user: RequestUser,
    @Body(new ZodValidationPipe(boardSchema)) data: BoardSchema,
  ) {
    return this.boardService.create(BoardType.NOTICE, data, user);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id', ParseIntPipe) id: number,
    @User() user: RequestUser,
    @Body(new ZodValidationPipe(boardSchema)) data: BoardSchema,
  ) {
    return this.boardService.update(BoardType.NOTICE, id, data, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id', ParseIntPipe) id: number, @User() user: RequestUser) {
    return this.boardService.remove(BoardType.NOTICE, id, user);
  }

  @Post(':id/files')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async upload(
    @Param('id', ParseIntPipe) id: number,
    @User() user: RequestUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    await this.boardService.assertEditable(BoardType.NOTICE, id, user);

    return this.fileService.upload(id, file);
  }
}
