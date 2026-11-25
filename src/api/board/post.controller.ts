// src/api/board/post.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
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
import { boardSchema, commentSchema } from './schema/board.schema';
import type { BoardSchema, CommentInput } from './schema/board.schema';
import { BoardService } from './board.service';
import { FileService } from '../file/file.service';

@Controller({ path: 'posts', version: '1' })
@UseGuards(JwtAuthGuard)
export class PostController {
  constructor(
    private readonly boardService: BoardService,
    private readonly fileService: FileService,
  ) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  findAll(@Query('q') q?: string) {
    return this.boardService.findAll(
      BoardType.GENERAL,
      typeof q === 'string' ? q : undefined,
    );
  }

  @Get(':id')
  @Header('Cache-Control', 'no-store')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.boardService.findOne(BoardType.GENERAL, id);
  }

  @Post()
  create(
    @User() user: RequestUser,
    @Body(new ZodValidationPipe(boardSchema)) data: BoardSchema,
  ) {
    return this.boardService.create(BoardType.GENERAL, data, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @User() user: RequestUser,
    @Body(new ZodValidationPipe(boardSchema)) data: BoardSchema,
  ) {
    return this.boardService.update(BoardType.GENERAL, id, data, user);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @User() user: RequestUser) {
    return this.boardService.remove(BoardType.GENERAL, id, user);
  }

  @Post(':id/files')
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
    await this.boardService.assertEditable(BoardType.GENERAL, id, user);

    return this.fileService.upload(id, file);
  }

  @Get(':id/comments')
  @Header('Cache-Control', 'no-store')
  findComments(@Param('id', ParseIntPipe) id: number) {
    return this.boardService.findComments(id);
  }

  @Post(':id/comments')
  createComment(
    @Param('id', ParseIntPipe) id: number,
    @User() user: RequestUser,
    @Body(new ZodValidationPipe(commentSchema)) data: CommentInput,
  ) {
    return this.boardService.createComment(id, data, user);
  }

  @Delete(':id/comments/:commentId')
  removeComment(
    @Param('id', ParseIntPipe) id: number,
    @Param('commentId', ParseIntPipe) commentId: number,
    @User() user: RequestUser,
  ) {
    return this.boardService.removeComment(id, commentId, user);
  }

  @Delete(':id/files/:attachmentId')
  async removeFile(
    @Param('id', ParseIntPipe) id: number,
    @Param('attachmentId', ParseIntPipe) attachmentId: number,
    @User() user: RequestUser,
  ) {
    await this.boardService.assertEditable(BoardType.GENERAL, id, user);

    return this.fileService.removeOneFromPost(id, attachmentId);
  }
}
