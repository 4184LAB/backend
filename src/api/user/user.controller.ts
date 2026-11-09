import {
  Body,
  Controller,
  Get,
  Header,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { User } from '../../common/decorators/user.decorator';
import type { RequestUser } from '../../common/decorators/user.decorator';
import { ZodValidationPipe } from '../../common/pipe/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/jwt/jwt.guard';
import { profileSchema } from './schema/user.schema';
import type { ProfileInput } from './schema/user.schema';
import { UserService } from './user.service';

@Controller({ path: 'users', version: '1' })
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @Header('Cache-Control', 'no-store')
  getProfile(@User() user: RequestUser) {
    return user;
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
}
