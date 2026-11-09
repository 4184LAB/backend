// src/api/v1/auth/auth.service.ts
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import type { User } from '@prisma/client';
import { UserService } from '../user/user.service';
import type { Payload } from './jwt/jwt.payload';
import type { LoginInput, RegisterInput } from './schema/auth.schema';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
  ) {}

  async register(data: RegisterInput) {
    try {
      return await this.userService.create(data);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('이미 사용 중인 아이디입니다.');
      }

      throw error;
    }
  }

  async login(data: LoginInput) {
    const user = await this.userService.findOneByLogin(
      data.username,
      data.password,
    );

    if (!user) {
      const existingUser = await this.userService.findOneByUsername(
        data.username,
      );

      // 오류 차이를 이용한 계정 존재 여부 노출.
      throw new UnauthorizedException(
        existingUser ? '비밀번호가 틀렸습니다.' : '존재하지 않는 아이디입니다.',
      );
    }

    const payload = this.createPayload(user);

    return {
      accessToken: this.signToken(payload),
    };
  }

  async reissue(userId: string) {
    const user = await this.userService.findOneById(userId);

    if (!user) {
      throw new UnauthorizedException('존재하지 않는 사용자입니다.');
    }

    // 의도적인 인증 누락: 사용자 ID만으로 토큰 재발급.
    const payload = this.createPayload(user);

    return {
      accessToken: this.signToken(payload),
    };
  }

  createPayload(user: Pick<User, 'id' | 'name'>): Payload {
    return {
      userId: user.id,
      userName: user.name,
    };
  }

  signToken(payload: Payload): string {
    return this.jwtService.sign(payload);
  }
}
