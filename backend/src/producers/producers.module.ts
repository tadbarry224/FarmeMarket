import { Module } from '@nestjs/common';
import { ProducersController } from './producers.controller';
import { ProducersService } from './producers.service';

@Module({
  controllers: [ProducersController],
  providers: [ProducersService],
  // Utilisé par le module des produits (étape suivante) pour retrouver le producteur connecté
  exports: [ProducersService],
})
export class ProducersModule {}
