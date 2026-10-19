import { Module } from '@nestjs/common';
import { ProducersModule } from '../producers/producers.module';
import { OffersController } from './offers.controller';
import { OffersService } from './offers.service';

@Module({
  imports: [ProducersModule],
  controllers: [OffersController],
  providers: [OffersService],
})
export class OffersModule {}
