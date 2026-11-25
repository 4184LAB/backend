// src/api/v1/user/user.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BoardType, Role } from '@prisma/client';
import type { User } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type { RegisterInput } from '../auth/schema/auth.schema';
import type {
  PasswordInput,
  ProfileInput,
  WithdrawInput,
} from './schema/user.schema';

export const publicUserSelect = {
  id: true,
  username: true,
  name: true,
  role: true,
  createdAt: true,
} as const;

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  findOneById(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
    });
  }

  findOneByUsername(username: string) {
    return this.prisma.user.findUnique({
      where: { username },
    });
  }

  async findOneByLogin(
    username: string,
    password: string,
  ): Promise<User | null> {
    // 의도적으로 취약한 SQL Injection 실습 코드.
    const users = await this.prisma.$queryRawUnsafe<User[]>(
      `SELECT * FROM "user"
       WHERE username = '${username}'
       AND password = '${password}'
       LIMIT 1`,
    );

    return users[0] ?? null;
  }

  async create(data: RegisterInput) {
    // 첫 번째로 가입한 회원은 관리자가 된다 (프론트엔드 화면 규칙).
    const isFirstUser = (await this.prisma.user.count()) === 0;

    return this.prisma.user.create({
      // 요청의 role을 그대로 저장: 파라미터 변조 실습.
      data: isFirstUser ? { ...data, role: Role.ADMIN } : data,
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
      },
    });
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: publicUserSelect,
    });

    if (!user) {
      throw new NotFoundException('존재하지 않는 사용자입니다.');
    }

    return user;
  }

  async getActivity(userId: string) {
    const [posts, commentCount] = await Promise.all([
      this.prisma.post.findMany({
        where: { authorId: userId, type: BoardType.GENERAL, deletedAt: null },
        select: {
          id: true,
          title: true,
          createdAt: true,
          _count: { select: { comments: true } },
        },
        orderBy: { id: 'desc' },
      }),
      this.prisma.comment.count({
        where: { authorId: userId, post: { deletedAt: null } },
      }),
    ]);

    return { posts, commentCount };
  }

  updateUserInfo(userId: string, data: ProfileInput) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
      },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
      },
    });
  }

  // 비밀번호는 기존 로그인(SQL Injection 실습)과 맞추기 위해 평문으로 비교/저장한다.
  async changePassword(userId: string, data: PasswordInput) {
    const user = await this.findOneById(userId);

    if (!user || user.password !== data.currentPassword) {
      throw new BadRequestException('현재 비밀번호가 올바르지 않습니다.');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: data.newPassword },
    });

    return { message: '비밀번호를 변경했습니다.' };
  }

  async withdraw(userId: string, data: WithdrawInput) {
    const user = await this.findOneById(userId);

    if (!user || user.password !== data.password) {
      throw new BadRequestException('비밀번호가 올바르지 않습니다.');
    }

    await this.assertNotLastAdmin(user);
    await this.prisma.user.delete({ where: { id: userId } });

    return { message: '탈퇴했습니다.' };
  }

  async assertNotLastAdmin(user: Pick<User, 'role'>) {
    if (user.role !== Role.ADMIN) return;

    const adminCount = await this.prisma.user.count({
      where: { role: Role.ADMIN },
    });

    if (adminCount <= 1) {
      throw new BadRequestException(
        '마지막 관리자는 탈퇴할 수 없습니다. 다른 회원을 관리자로 지정하세요.',
      );
    }
  }
}
