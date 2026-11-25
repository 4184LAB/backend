import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { BoardType, Prisma } from '@prisma/client';
import type { RequestUser } from '../../common/decorators/user.decorator';
import { PrismaService } from '../../database/prisma.service';
import type { SearchInput } from './schema/search.schema';

const DELETED_AUTHOR = '(탈퇴한 회원)';
const LIMIT = 200;

export type SearchRow = {
  id: string;
  // 결과를 열 화면 경로를 만들 때 쓴다.
  postType: BoardType | null;
  postId: number | null;
  title: string;
  detail: string;
  author: string;
  createdAt: Date;
};

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(params: SearchInput, viewer: RequestUser | null) {
    // 날짜 범위는 한국 시간(KST) 기준으로 비교한다.
    const createdAt: Prisma.DateTimeFilter = {};
    if (params.from) createdAt.gte = new Date(`${params.from}T00:00:00+09:00`);
    if (params.to) createdAt.lte = new Date(`${params.to}T23:59:59.999+09:00`);

    const keyword = params.q || undefined;
    const contains = (value: string) => ({
      contains: value,
      mode: Prisma.QueryMode.insensitive,
    });
    const orderBy = {
      createdAt: params.sort === 'latest' ? 'desc' : 'asc',
    } as const;

    let rows: SearchRow[];

    if (params.type === 'posts') {
      // 일반 게시글은 로그인한 사용자에게만, 공지는 누구에게나 보인다.
      const posts = await this.prisma.post.findMany({
        where: {
          deletedAt: null,
          createdAt,
          ...(viewer ? {} : { type: BoardType.NOTICE }),
          ...(keyword && {
            OR: [{ title: contains(keyword) }, { content: contains(keyword) }],
          }),
        },
        select: {
          id: true,
          type: true,
          title: true,
          content: true,
          createdAt: true,
          author: { select: { name: true } },
        },
        orderBy,
        take: LIMIT,
      });

      rows = posts.map((post) => ({
        id: String(post.id),
        postType: post.type,
        postId: post.id,
        title: post.title,
        detail: post.content.slice(0, 80),
        author: post.author?.name ?? DELETED_AUTHOR,
        createdAt: post.createdAt,
      }));
    } else if (params.type === 'comments') {
      if (!viewer) {
        throw new UnauthorizedException(
          '댓글 검색은 로그인 후 사용할 수 있습니다.',
        );
      }

      const comments = await this.prisma.comment.findMany({
        where: {
          createdAt,
          post: { deletedAt: null },
          ...(keyword && { content: contains(keyword) }),
        },
        select: {
          id: true,
          content: true,
          createdAt: true,
          author: { select: { name: true } },
          post: { select: { id: true, type: true, title: true } },
        },
        orderBy,
        take: LIMIT,
      });

      rows = comments.map((comment) => ({
        id: String(comment.id),
        postType: comment.post.type,
        postId: comment.post.id,
        title: comment.post.title,
        detail: comment.content.slice(0, 80),
        author: comment.author?.name ?? DELETED_AUTHOR,
        createdAt: comment.createdAt,
      }));
    } else {
      if (viewer?.role !== 'ADMIN') {
        throw new ForbiddenException(
          '회원 검색은 관리자만 사용할 수 있습니다.',
        );
      }

      const users = await this.prisma.user.findMany({
        where: {
          createdAt,
          ...(keyword && {
            OR: [{ name: contains(keyword) }, { username: contains(keyword) }],
          }),
        },
        select: {
          id: true,
          username: true,
          name: true,
          role: true,
          createdAt: true,
        },
        orderBy,
        take: LIMIT,
      });

      rows = users.map((user) => ({
        id: user.id,
        postType: null,
        postId: null,
        title: user.name,
        detail: user.username,
        author: user.role === 'ADMIN' ? '관리자' : '회원',
        createdAt: user.createdAt,
      }));
    }

    return { params, count: rows.length, rows };
  }
}
