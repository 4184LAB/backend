import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { BoardModule } from './board/board.module';
import { FileModule } from './file/file.module';

@Module({
  imports: [AuthModule, UserModule, BoardModule, FileModule],
})
export class ApiModule {}
