import {
  ChainIDEnums, ContractType, getContractByContractType
} from 'omz-module';

import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { defineCollection } from './db';
import { EventWatcher } from './event-watcher';

async function bootstrap() {
  await defineCollection();
  const watcher = new EventWatcher();
  await watcher.init(ChainIDEnums.GOERLI, getContractByContractType(ChainIDEnums.GOERLI, ContractType.SELLER_VAULT))
  watcher.run();

  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}
bootstrap();
