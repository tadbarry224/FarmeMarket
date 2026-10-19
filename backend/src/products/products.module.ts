import { Module } from '@nestjs/common';
import { ProducersModule } from '../producers/producers.module';
import { CatalogService } from './catalog.service';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [ProducersModule],
  controllers: [ProductsController],
  providers: [ProductsService, CatalogService],
})
export class ProductsModule {}
