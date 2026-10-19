import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Put,
} from '@nestjs/common';
import { Role, type Producer } from '../generated/prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { JwtPayload } from '../auth/jwt-payload';
import { UpsertProducerProfileDto } from './dto/upsert-producer-profile.dto';
import { ProducersService } from './producers.service';
import type { PublicProducer } from './public-producer';

@Controller('producers')
export class ProducersController {
  constructor(private readonly producersService: ProducersService) {}

  // Profil producteur de l'utilisateur connecté, y compris son adresse précise
  @Roles(Role.PRODUCER)
  @Get('me')
  getOwnProfile(@CurrentUser() user: JwtPayload): Promise<Producer> {
    return this.producersService.getOwnProfile(user.sub);
  }

  @Roles(Role.PRODUCER)
  @Put('me')
  upsertOwnProfile(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpsertProducerProfileDto,
  ): Promise<Producer> {
    return this.producersService.upsertOwnProfile(user.sub, dto);
  }

  // Profil public, consultable sans compte
  @Public()
  @Get(':id')
  getPublicProfile(
    @Param(
      'id',
      // Un identifiant mal formé ne peut correspondre à aucun producteur
      new ParseUUIDPipe({
        exceptionFactory: () =>
          new NotFoundException('Producteur introuvable.'),
      }),
    )
    id: string,
  ): Promise<PublicProducer> {
    return this.producersService.getPublicProfile(id);
  }
}
