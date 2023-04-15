import { ChainIDEnums } from 'omz-module';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { Watcher } from './watcher';

async function bootstrap() {
  const watcherMumbai = new Watcher();
  await watcherMumbai.init(ChainIDEnums.MUMBAI)
  watcherMumbai.run();

  const watcherGoerli = new Watcher();
  await watcherGoerli.init(ChainIDEnums.GOERLI)
  watcherGoerli.run();

  const watcherOGoerli = new Watcher();
  await watcherOGoerli.init(ChainIDEnums.OGOERLI)
  watcherOGoerli.run();

  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }))

  app.enableCors({
    'origin': "*",
  });

  await app.listen(10140);
}

bootstrap();
