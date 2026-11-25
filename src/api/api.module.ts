import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { BoardModule } from './board/board.module';
import { FileModule } from './file/file.module';
import { AdminModule } from './admin/admin.module';
import { SearchModule } from './search/search.module';

@Module({
  imports: [
    AuthModule,
    UserModule,
    BoardModule,
    FileModule,
    AdminModule,
    SearchModule,
  ],
})
export class ApiModule {}
