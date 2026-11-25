import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { User } from '../../common/decorators/user.decorator';
import type { RequestUser } from '../../common/decorators/user.decorator';
import { ZodValidationPipe } from '../../common/pipe/zod-validation.pipe';
import { AdminGuard } from '../auth/jwt/jwt.guard';
import { AdminService } from './admin.service';
import { roleSchema } from './schema/admin.schema';
import type { RoleInput } from './schema/admin.schema';

@Controller({ path: 'admin', version: '1' })
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('overview')
  @Header('Cache-Control', 'no-store')
  overview() {
    return this.adminService.overview();
  }

  @Patch('users/:id/role')
  setRole(
    @User() admin: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(roleSchema)) data: RoleInput,
  ) {
    return this.adminService.setRole(admin.id, id, data);
  }

  @Delete('users/:id')
  removeUser(
    @User() admin: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.adminService.removeUser(admin.id, id);
  }

  @Delete('posts/:id')
  removePost(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.removePost(id);
  }

  @Get('backup')
  @Header('Cache-Control', 'no-store')
  backup() {
    return this.adminService.backup();
  }
}
