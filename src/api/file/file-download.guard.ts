import {
  ExecutionContext,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { BoardType } from '@prisma/client';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt/jwt.guard';
import { FileService } from './file.service';

@Injectable()
export class FileDownloadGuard extends JwtAuthGuard {
  constructor(private readonly fileService: FileService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const attachment = await this.fileService.findAttachment(
      request.query.filename,
    );

    if (attachment?.post.deletedAt) {
      throw new NotFoundException('파일을 찾을 수 없습니다.');
    }

    if (attachment?.post.type === BoardType.NOTICE) return true;

    // 일반 게시글 첨부파일과 DB 미등록 경로는 JWT 인증 후 처리한다.
    if ((await super.canActivate(context)) !== true) {
      throw new UnauthorizedException();
    }
    return true;
  }
}
