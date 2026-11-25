import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { RequestUser } from '../../../common/decorators/user.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

// 토큰이 없거나 잘못돼도 막지 않고 request.user를 null로 둔다.
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = RequestUser | null>(
    _error: unknown,
    user: TUser | false,
  ): TUser {
    return (user || null) as TUser;
  }
}

// JWT 인증 후 ADMIN 권한까지 확인한다.
@Injectable()
export class AdminGuard extends JwtAuthGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    await super.canActivate(context);

    const request = context.switchToHttp().getRequest<{ user?: RequestUser }>();

    if (request.user?.role !== 'ADMIN') {
      throw new ForbiddenException('관리자 권한이 필요합니다.');
    }

    return true;
  }
}
