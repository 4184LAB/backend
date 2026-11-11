// src/api/v1/auth/auth.controller.ts
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Header,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import { User } from '../../common/decorators/user.decorator';
import type { RequestUser } from '../../common/decorators/user.decorator';
import { ZodValidationPipe } from '../../common/pipe/zod-validation.pipe';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt/jwt.guard';
import {
  loginSchema,
  registerSchema,
  reissueSchema,
} from './schema/auth.schema';
import type {
  LoginInput,
  RegisterInput,
  ReissueInput,
} from './schema/auth.schema';

@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(
    @Body(new ZodValidationPipe(registerSchema))
    data: RegisterInput,
  ) {
    return this.authService.register(data);
  }

  @Post('login')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  login(
    @Body(new ZodValidationPipe(loginSchema))
    data: LoginInput,
  ) {
    return this.authService.login(data);
  }

  @Post('reissue')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  reissue(
    @Body(new ZodValidationPipe(reissueSchema))
    data: ReissueInput,
  ) {
    return this.authService.reissue(data.userId);
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard)
  getAdmin(@User() user: RequestUser) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('관리자 권한이 필요합니다.');
    }

    return user;
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  logout() {
    // JWT를 서버에서 폐기하지 않아 복사한 토큰은 재사용 가능.
    return { message: '로그아웃되었습니다.' };
  }
}
