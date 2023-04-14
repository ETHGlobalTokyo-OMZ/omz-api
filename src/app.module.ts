import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OtcModule } from './otc/otc.module';

@Module({
  imports: [OtcModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
