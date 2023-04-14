import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { defineCollection } from './db';

async function bootstrap() {
  await defineCollection();

  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}
bootstrap();
