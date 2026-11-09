import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { User as PrismaUser } from '@prisma/client';

export type RequestUser = Pick<PrismaUser, 'id' | 'username' | 'name' | 'role'>;

export const User = createParamDecorator(
  (_data: unknown, context: ExecutionContext): RequestUser => {
    const request = context.switchToHttp().getRequest<{ user: RequestUser }>();

    return request.user;
  },
);
