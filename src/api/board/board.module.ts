import { Module } from '@nestjs/common';
import { BoardService } from './board.service';
import { NoticeController } from './notice.controller';
import { PrismaModule } from 'src/database/prisma.module';
import { PostController } from './post.controller';
import { FileModule } from '../file/file.module';
import { JwtAuthGuard } from '../auth/jwt/jwt.guard';

@Module({
  imports: [PrismaModule, FileModule],
  controllers: [NoticeController, PostController],
  providers: [BoardService, JwtAuthGuard],
  exports: [BoardService],
})
export class BoardModule {}
