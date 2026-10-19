import { Module } from '@nestjs/common';
import { ProducersModule } from '../producers/producers.module';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';

@Module({
  imports: [ProducersModule],
  controllers: [RequestsController],
  providers: [RequestsService],
})
export class RequestsModule {}
