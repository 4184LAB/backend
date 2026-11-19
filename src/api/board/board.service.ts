import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BoardType } from '@prisma/client';
import type { RequestUser } from '../../common/decorators/user.decorator';
import { PrismaService } from '../../database/prisma.service';
import type { BoardSchema } from './schema/board.schema';

@Injectable()
export class BoardService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(type: BoardType) {
    return this.prisma.post.findMany({
      where: {
        type,
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
        author: {
          select: { name: true },
        },
      },
      orderBy: { id: 'desc' },
      take: 100,
    });
  }

  async findOne(type: BoardType, id: number) {
    const post = await this.prisma.post.findFirst({
      where: {
        id,
        type,
        deletedAt: null,
      },
      include: {
        author: {
          select: { name: true },
        },
        attachments: {
          select: {
            id: true,
            originalName: true,
            storedName: true,
            size: true,
            createdAt: true,
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('게시글을 찾을 수 없습니다.');
    }

    return post;
  }

  private checkPermission(
    type: BoardType,
    user: RequestUser,
    authorId?: string,
  ) {
    if (type === BoardType.NOTICE) {
      if (user.role !== 'ADMIN') {
        throw new ForbiddenException('관리자만 사용할 수 있습니다.');
      }

      return;
    }

    if (authorId && authorId !== user.id) {
      throw new ForbiddenException('작성자만 사용할 수 있습니다.');
    }
  }

  async assertEditable(type: BoardType, id: number, user: RequestUser) {
    const post = await this.findOne(type, id);

    this.checkPermission(type, user, post.authorId);

    return post;
  }

  create(type: BoardType, data: BoardSchema, user: RequestUser) {
    this.checkPermission(type, user);

    return this.prisma.post.create({
      data: {
        type,
        title: data.title,
        content: data.content,
        authorId: user.id,
      },
    });
  }

  async update(
    type: BoardType,
    id: number,
    data: BoardSchema,
    user: RequestUser,
  ) {
    await this.assertEditable(type, id, user);

    return this.prisma.post.update({
      where: { id },
      data: {
        title: data.title,
        content: data.content,
      },
    });
  }

  async remove(type: BoardType, id: number, user: RequestUser) {
    await this.assertEditable(type, id, user);

    await this.prisma.post.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { message: '게시글이 삭제되었습니다.' };
  }
}
