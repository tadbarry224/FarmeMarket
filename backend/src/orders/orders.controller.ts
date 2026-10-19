import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Role } from '../generated/prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { JwtPayload } from '../auth/jwt-payload';
import type { Page } from '../common/pagination';
import { CreateOrderDto } from './dto/create-order.dto';
import { DeliveryDto } from './dto/delivery.dto';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import type { OrderDetailView, OrderView } from './order-view';
import { OrdersService } from './orders.service';

// Un identifiant mal formé ne peut correspondre à aucune commande ni offre
const orderIdPipe = new ParseUUIDPipe({
  exceptionFactory: () => new NotFoundException('Commande introuvable.'),
});
const offerIdPipe = new ParseUUIDPipe({
  exceptionFactory: () => new NotFoundException('Offre introuvable.'),
});

// Commandes. L'acceptation d'une offre est ici et non dans le module des offres :
// c'est elle qui crée la commande.
@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // Commande d'un produit du catalogue
  @Roles(Role.BUYER)
  @Post('orders')
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateOrderDto,
  ): Promise<OrderDetailView> {
    return this.ordersService.createFromProduct(user.sub, dto);
  }

  @Roles(Role.BUYER)
  @Post('offers/:id/accept')
  acceptOffer(
    @CurrentUser() user: JwtPayload,
    @Param('id', offerIdPipe) offerId: string,
    @Body() dto: DeliveryDto,
  ): Promise<OrderDetailView> {
    return this.ordersService.acceptOffer(user.sub, offerId, dto);
  }

  // Déclarées avant GET /orders/:id, sinon « purchases » et « sales » seraient lus comme des identifiants
  @Roles(Role.BUYER)
  @Get('orders/purchases')
  listPurchases(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListOrdersQueryDto,
  ): Promise<Page<OrderView>> {
    return this.ordersService.listPurchases(user.sub, query);
  }

  @Roles(Role.PRODUCER)
  @Get('orders/sales')
  listSales(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListOrdersQueryDto,
  ): Promise<Page<OrderView>> {
    return this.ordersService.listSales(user.sub, query);
  }

  // Détail et historique des statuts, pour l'acheteur ou le producteur de la commande
  @Roles(Role.BUYER, Role.PRODUCER)
  @Get('orders/:id')
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id', orderIdPipe) id: string,
  ): Promise<OrderDetailView> {
    return this.ordersService.findOne(user.sub, id);
  }

  @Roles(Role.BUYER, Role.PRODUCER)
  @Patch('orders/:id/status')
  updateStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id', orderIdPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
  ): Promise<OrderDetailView> {
    return this.ordersService.updateStatus(user.sub, id, dto);
  }
}
