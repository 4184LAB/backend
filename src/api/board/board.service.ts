import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BoardType } from '@prisma/client';
import type { RequestUser } from '../../common/decorators/user.decorator';
import { PrismaService } from '../../database/prisma.service';
import type { BoardSchema, CommentInput } from './schema/board.schema';

@Injectable()
export class BoardService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(type: BoardType, q?: string) {
    const keyword = q?.trim();

    return this.prisma.post.findMany({
      where: {
        type,
        deletedAt: null,
        ...(keyword && {
          OR: [
            { title: { contains: keyword, mode: 'insensitive' } },
            { content: { contains: keyword, mode: 'insensitive' } },
          ],
        }),
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
        author: {
          select: { name: true },
        },
        _count: {
          select: { comments: true },
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
    post?: { authorId: string | null },
  ) {
    if (type === BoardType.NOTICE) {
      if (user.role !== 'ADMIN') {
        throw new ForbiddenException('관리자만 사용할 수 있습니다.');
      }

      return;
    }

    // 작성자가 탈퇴해 authorId가 null인 글도 다른 사람이 수정할 수 없어야 한다.
    if (post && post.authorId !== user.id) {
      throw new ForbiddenException('작성자만 사용할 수 있습니다.');
    }
  }

  async assertEditable(type: BoardType, id: number, user: RequestUser) {
    const post = await this.findOne(type, id);

    this.checkPermission(type, user, post);

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

    return this.softDelete(id);
  }

  async softDelete(id: number) {
    await this.prisma.post.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { message: '게시글이 삭제되었습니다.' };
  }

  // ---- 댓글 (일반 게시글 전용) ----

  async findComments(postId: number) {
    await this.findOne(BoardType.GENERAL, postId);

    return this.prisma.comment.findMany({
      where: { postId },
      select: {
        id: true,
        content: true,
        authorId: true,
        createdAt: true,
        author: { select: { name: true } },
      },
      orderBy: { id: 'asc' },
    });
  }

  async createComment(postId: number, data: CommentInput, user: RequestUser) {
    await this.findOne(BoardType.GENERAL, postId);

    return this.prisma.comment.create({
      data: {
        postId,
        content: data.content,
        authorId: user.id,
      },
      select: {
        id: true,
        content: true,
        authorId: true,
        createdAt: true,
        author: { select: { name: true } },
      },
    });
  }

  async removeComment(postId: number, commentId: number, user: RequestUser) {
    const comment = await this.prisma.comment.findFirst({
      where: { id: commentId, postId, post: { deletedAt: null } },
    });

    if (!comment) {
      throw new NotFoundException('댓글을 찾을 수 없습니다.');
    }

    if (user.role !== 'ADMIN' && comment.authorId !== user.id) {
      throw new ForbiddenException('작성자만 사용할 수 있습니다.');
    }

    await this.prisma.comment.delete({ where: { id: commentId } });

    return { message: '댓글이 삭제되었습니다.' };
  }
}
