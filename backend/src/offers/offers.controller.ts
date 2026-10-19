import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { Role } from '../generated/prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { JwtPayload } from '../auth/jwt-payload';
import { requestIdPipe } from '../requests/requests.controller';
import { SaveOfferDto } from './dto/save-offer.dto';
import { UpdateOfferStatusDto } from './dto/update-offer-status.dto';
import type { OfferView } from './offer-view';
import { OffersService } from './offers.service';

// Un identifiant mal formé ne peut correspondre à aucune offre
const offerIdPipe = new ParseUUIDPipe({
  exceptionFactory: () => new NotFoundException('Offre introuvable.'),
});

// Offres des producteurs. Une offre se crée sous la demande à laquelle elle répond
// (POST /requests/:id/offers), puis se gère via /offers.
@Controller()
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  @Roles(Role.PRODUCER)
  @Post('requests/:id/offers')
  create(
    @CurrentUser() user: JwtPayload,
    @Param('id', requestIdPipe) requestId: string,
    @Body() dto: SaveOfferDto,
  ): Promise<OfferView> {
    return this.offersService.create(user.sub, requestId, dto);
  }

  @Roles(Role.PRODUCER)
  @Get('offers/mine')
  findMine(@CurrentUser() user: JwtPayload): Promise<OfferView[]> {
    return this.offersService.findMine(user.sub);
  }

  @Roles(Role.PRODUCER)
  @Put('offers/:id')
  replace(
    @CurrentUser() user: JwtPayload,
    @Param('id', offerIdPipe) id: string,
    @Body() dto: SaveOfferDto,
  ): Promise<OfferView> {
    return this.offersService.replace(user.sub, id, dto);
  }

  // Retrait par le producteur, refus par l'acheteur
  @Roles(Role.PRODUCER, Role.BUYER)
  @Patch('offers/:id/status')
  updateStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id', offerIdPipe) id: string,
    @Body() dto: UpdateOfferStatusDto,
  ): Promise<OfferView> {
    return this.offersService.updateStatus(user.sub, id, dto.status);
  }
}
