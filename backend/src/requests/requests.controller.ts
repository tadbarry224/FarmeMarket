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
  Query,
} from '@nestjs/common';
import { Role } from '../generated/prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { JwtPayload } from '../auth/jwt-payload';
import type { Page } from '../common/pagination';
import { ClosePurchaseRequestDto } from './dto/close-purchase-request.dto';
import { ListOpenRequestsQueryDto } from './dto/list-open-requests-query.dto';
import { SavePurchaseRequestDto } from './dto/save-purchase-request.dto';
import type {
  BuyerRequestDetail,
  BuyerRequestSummary,
  ProducerRequestView,
} from './purchase-request-views';
import { RequestsService } from './requests.service';

// Un identifiant mal formé ne peut correspondre à aucune demande
export const requestIdPipe = new ParseUUIDPipe({
  exceptionFactory: () => new NotFoundException('Demande introuvable.'),
});

// Demandes d'achat. Aucune route n'est publique : les demandes ne sont visibles
// que par leur auteur et par les producteurs.
@Controller('requests')
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Roles(Role.BUYER)
  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: SavePurchaseRequestDto,
  ): Promise<BuyerRequestDetail> {
    return this.requestsService.create(user.sub, dto);
  }

  // Demandes ouvertes, triées par pertinence pour le producteur connecté
  @Roles(Role.PRODUCER)
  @Get()
  listOpen(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListOpenRequestsQueryDto,
  ): Promise<Page<ProducerRequestView>> {
    return this.requestsService.listOpen(user.sub, query);
  }

  // Déclarée avant GET /requests/:id, sinon « mine » serait lu comme un identifiant
  @Roles(Role.BUYER)
  @Get('mine')
  findMine(@CurrentUser() user: JwtPayload): Promise<BuyerRequestSummary[]> {
    return this.requestsService.findMine(user.sub);
  }

  // Vue de l'auteur (avec les offres reçues) ou vue producteur (avec son offre)
  @Roles(Role.BUYER, Role.PRODUCER)
  @Get(':id')
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id', requestIdPipe) id: string,
  ): Promise<BuyerRequestDetail | ProducerRequestView> {
    return this.requestsService.findOne(user, id);
  }

  @Roles(Role.BUYER)
  @Put(':id')
  replace(
    @CurrentUser() user: JwtPayload,
    @Param('id', requestIdPipe) id: string,
    @Body() dto: SavePurchaseRequestDto,
  ): Promise<BuyerRequestDetail> {
    return this.requestsService.replace(user.sub, id, dto);
  }

  @Roles(Role.BUYER)
  @Patch(':id/status')
  close(
    @CurrentUser() user: JwtPayload,
    @Param('id', requestIdPipe) id: string,
    // Le DTO n'accepte que CLOSED : sa présence suffit
    @Body() _dto: ClosePurchaseRequestDto,
  ): Promise<BuyerRequestDetail> {
    return this.requestsService.close(user.sub, id);
  }
}
