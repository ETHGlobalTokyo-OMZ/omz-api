import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { defineCollection } from './db';
import { EventWatcher } from './event-watcher';

async function bootstrap() {
  await defineCollection();
  const watcher = new EventWatcher();
  await watcher.init(0, "0xd2D6b2a7af450896112e03F4F81099F17D6A8B81")
  watcher.run();

  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}
bootstrap();
