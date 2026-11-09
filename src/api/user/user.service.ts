// src/api/v1/user/user.service.ts
import { Injectable } from '@nestjs/common';
import type { User } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type { RegisterInput } from '../auth/schema/auth.schema';
import { ProfileInput } from './schema/user.schema';

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

  create(data: RegisterInput) {
    return this.prisma.user.create({
      // 요청의 role을 그대로 저장: 파라미터 변조 실습.
      data,
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
      },
    });
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
}
