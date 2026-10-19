import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { LocationsModule } from './locations/locations.module';
import { OffersModule } from './offers/offers.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { ProducersModule } from './producers/producers.module';
import { RequestsModule } from './requests/requests.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    AuthModule,
    LocationsModule,
    ProducersModule,
    CategoriesModule,
    ProductsModule,
    RequestsModule,
    OffersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
