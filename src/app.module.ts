import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { envSchema } from './config/env.schema';
import { ApiModule } from './api/api.module';
import { PrismaModule } from './database/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => envSchema.parse(config),
    }),
    ApiModule,
    PrismaModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
