import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { BoardModule } from '../board/board.module';
import { UserModule } from '../user/user.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [PrismaModule, BoardModule, UserModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
