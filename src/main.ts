import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { EnvSchema } from './config/env.schema';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const env = app.get(ConfigService<EnvSchema, true>);
  const port = env.get('PORT', { infer: true });

  await app.listen(port);
}
bootstrap();
