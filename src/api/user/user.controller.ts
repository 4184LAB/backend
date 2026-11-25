import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { User } from '../../common/decorators/user.decorator';
import type { RequestUser } from '../../common/decorators/user.decorator';
import { ZodValidationPipe } from '../../common/pipe/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/jwt/jwt.guard';
import {
  passwordSchema,
  profileSchema,
  withdrawSchema,
} from './schema/user.schema';
import type {
  PasswordInput,
  ProfileInput,
  WithdrawInput,
} from './schema/user.schema';
import { UserService } from './user.service';

@Controller({ path: 'users', version: '1' })
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @Header('Cache-Control', 'no-store')
  getProfile(@User() user: RequestUser) {
    return this.userService.getProfile(user.id);
  }

  @Patch('me')
  @Header('Cache-Control', 'no-store')
  updateProfile(
    @User() user: RequestUser,
    @Body(new ZodValidationPipe(profileSchema))
    data: ProfileInput,
  ) {
    return this.userService.updateUserInfo(user.id, data);
  }

  @Get('me/activity')
  @Header('Cache-Control', 'no-store')
  getActivity(@User() user: RequestUser) {
    return this.userService.getActivity(user.id);
  }

  @Patch('me/password')
  changePassword(
    @User() user: RequestUser,
    @Body(new ZodValidationPipe(passwordSchema))
    data: PasswordInput,
  ) {
    return this.userService.changePassword(user.id, data);
  }

  // DELETE에 본문(비밀번호)을 받는다.
  @Delete('me')
  @HttpCode(200)
  withdraw(
    @User() user: RequestUser,
    @Body(new ZodValidationPipe(withdrawSchema))
    data: WithdrawInput,
  ) {
    return this.userService.withdraw(user.id, data);
  }
}
