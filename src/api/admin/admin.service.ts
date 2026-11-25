import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BoardType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { BoardService } from '../board/board.service';
import { UserService, publicUserSelect } from '../user/user.service';
import type { RoleInput } from './schema/admin.schema';

// 한국 시간(KST) 기준 오늘 0시
function startOfTodayKst() {
  const offset = 9 * 60 * 60 * 1000;
  const kstNow = new Date(Date.now() + offset);
  kstNow.setUTCHours(0, 0, 0, 0);
  return new Date(kstNow.getTime() - offset);
}

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boardService: BoardService,
    private readonly userService: UserService,
  ) {}

  async overview() {
    const general = { type: BoardType.GENERAL, deletedAt: null };

    const [users, posts, notices, comments, postsToday, userRows, recentPosts] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.post.count({ where: general }),
        this.prisma.post.count({
          where: { type: BoardType.NOTICE, deletedAt: null },
        }),
        this.prisma.comment.count({ where: { post: { deletedAt: null } } }),
        this.prisma.post.count({
          where: { ...general, createdAt: { gte: startOfTodayKst() } },
        }),
        this.prisma.user.findMany({
          select: {
            ...publicUserSelect,
            _count: { select: { posts: { where: general } } },
          },
          orderBy: { createdAt: 'asc' },
        }),
        this.prisma.post.findMany({
          where: general,
          select: {
            id: true,
            title: true,
            createdAt: true,
            author: { select: { name: true } },
          },
          orderBy: { id: 'desc' },
          take: 10,
        }),
      ]);

    return {
      stats: { users, posts, notices, comments, postsToday },
      users: userRows.map(({ _count, ...user }) => ({
        ...user,
        postCount: _count.posts,
      })),
      recentPosts,
    };
  }

  async setRole(adminId: string, userId: string, data: RoleInput) {
    if (adminId === userId) {
      throw new BadRequestException('자기 자신의 권한은 바꿀 수 없습니다.');
    }

    await this.findUser(userId);

    return this.prisma.user.update({
      where: { id: userId },
      data: { role: data.role },
      select: publicUserSelect,
    });
  }

  async removeUser(adminId: string, userId: string) {
    if (adminId === userId) {
      throw new BadRequestException(
        '자기 자신은 마이페이지에서 탈퇴해야 합니다.',
      );
    }

    const user = await this.findUser(userId);
    await this.userService.assertNotLastAdmin(user);
    await this.prisma.user.delete({ where: { id: userId } });

    return { message: '회원을 탈퇴시켰습니다.' };
  }

  // 관리자는 작성자와 관계없이 일반 게시글을 삭제할 수 있다.
  async removePost(postId: number) {
    await this.boardService.findOne(BoardType.GENERAL, postId);
    return this.boardService.softDelete(postId);
  }

  // 비밀번호를 뺀 전체 데이터
  async backup() {
    const [users, posts, comments, attachments] = await Promise.all([
      this.prisma.user.findMany({
        select: publicUserSelect,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.post.findMany({ orderBy: { id: 'asc' } }),
      this.prisma.comment.findMany({ orderBy: { id: 'asc' } }),
      this.prisma.attachment.findMany({ orderBy: { id: 'asc' } }),
    ]);

    return { users, posts, comments, attachments };
  }

  private async findUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('존재하지 않는 사용자입니다.');
    }

    return user;
  }
}
