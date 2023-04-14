import {
  ChainIDEnums, ContractType, getContractByContractType
} from 'omz-module';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { EscrowWatcher } from './escrow-watcher';
import { SellerWatcher } from './seller-watcher';

async function bootstrap() {
  const watcher = new SellerWatcher();
  await watcher.init(ChainIDEnums.MUMBAI, getContractByContractType(ChainIDEnums.MUMBAI, ContractType.SELLER_VAULT))
  watcher.run();

  const escrow = new EscrowWatcher();
  await escrow.init();
  escrow.run();

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

  await app.listen(3000);
}
bootstrap();
