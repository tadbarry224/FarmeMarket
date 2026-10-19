import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OfferStatus,
  OrderStatus,
  type Prisma,
  ProductStatus,
  PurchaseRequestStatus,
} from '../generated/prisma/client';
import { parseDateOnly, todayUtc } from '../common/dates';
import { type Page, resolvePagination } from '../common/pagination';
import { fieldErrorBody } from '../common/validation';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateOrderDto } from './dto/create-order.dto';
import type { DeliveryDto } from './dto/delivery.dto';
import type { ListOrdersQueryDto } from './dto/list-orders-query.dto';
import type { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { checkOrderTransition, requiresNote } from './order-transitions';
import {
  ORDER_DETAIL_SELECT,
  ORDER_SUMMARY_SELECT,
  type OrderDetailView,
  type OrderView,
  partyOf,
  toOrderDetailView,
  toOrderView,
} from './order-view';

const ORDER_NOT_FOUND = 'Commande introuvable.';
const OFFER_NOT_FOUND = 'Offre introuvable.';
// Montant au-delà duquel la conversion BigInt → nombre JavaScript perdrait en précision.
// Environ 9 millions de milliards de GNF : aucune commande réelle n'en approche.
const MAX_ORDER_AMOUNT = BigInt(Number.MAX_SAFE_INTEGER);

// Commandes : création (produit du catalogue ou offre acceptée), suivi des statuts et historique.
@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  // Commande d'un produit du catalogue. Elle attend l'accord du producteur :
  // le stock n'est réservé qu'à l'acceptation.
  async createFromProduct(
    userId: string,
    dto: CreateOrderDto,
  ): Promise<OrderDetailView> {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      select: {
        id: true,
        name: true,
        unit: true,
        pricePerUnit: true,
        quantity: true,
        status: true,
        availableUntil: true,
        producerId: true,
        producer: { select: { userId: true } },
      },
    });
    if (!product || product.status === ProductStatus.ARCHIVED) {
      throw new BadRequestException(
        fieldErrorBody(
          HttpStatus.BAD_REQUEST,
          'productId',
          'Produit introuvable.',
        ),
      );
    }
    if (product.producer.userId === userId) {
      throw new ForbiddenException(
        'Vous ne pouvez pas commander votre propre produit.',
      );
    }
    if (
      product.status === ProductStatus.SOLD_OUT ||
      (product.availableUntil && product.availableUntil < todayUtc())
    ) {
      throw new ConflictException("Ce produit n'est plus disponible.");
    }
    if (dto.quantity > product.quantity) {
      throw new BadRequestException(
        fieldErrorBody(
          HttpStatus.BAD_REQUEST,
          'quantity',
          `Quantité disponible : ${product.quantity.toLocaleString('fr-FR')}.`,
        ),
      );
    }

    const lineTotal = orderAmount(product.pricePerUnit, dto.quantity);
    const row = await this.prisma.order.create({
      data: {
        ...toDeliveryData(dto),
        status: OrderStatus.PENDING,
        totalAmount: lineTotal,
        buyer: { connect: { id: userId } },
        producer: { connect: { id: product.producerId } },
        items: {
          create: {
            product: { connect: { id: product.id } },
            productName: product.name,
            unit: product.unit,
            unitPrice: product.pricePerUnit,
            quantity: dto.quantity,
            lineTotal,
          },
        },
        events: {
          create: { status: OrderStatus.PENDING, actorId: userId },
        },
      },
      select: ORDER_DETAIL_SELECT,
    });
    return toOrderDetailView(row);
  }

  // L'acheteur accepte une offre reçue sur sa demande. En une seule transaction :
  // l'offre est acceptée, la demande est satisfaite, les autres offres en attente sont refusées
  // et la commande est créée, directement acceptée (le producteur s'est engagé en faisant son offre).
  async acceptOffer(
    userId: string,
    offerId: string,
    dto: DeliveryDto,
  ): Promise<OrderDetailView> {
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
      select: {
        status: true,
        quantity: true,
        pricePerUnit: true,
        producerId: true,
        productId: true,
        product: { select: { name: true } },
        request: {
          select: {
            id: true,
            buyerId: true,
            productName: true,
            unit: true,
            status: true,
          },
        },
      },
    });
    // Une offre retirée, ou reçue par un autre acheteur, n'est pas visible : introuvable
    if (
      !offer ||
      offer.request.buyerId !== userId ||
      offer.status === OfferStatus.WITHDRAWN
    ) {
      throw new NotFoundException(OFFER_NOT_FOUND);
    }
    if (offer.status !== OfferStatus.PENDING) {
      throw new ConflictException("Cette offre n'est plus en attente.");
    }
    if (offer.request.status !== PurchaseRequestStatus.OPEN) {
      throw new ConflictException("Cette demande n'accepte plus d'offres.");
    }

    const lineTotal = orderAmount(offer.pricePerUnit, offer.quantity);
    const delivery = toDeliveryData(dto);
    const requestId = offer.request.id;

    const row = await this.prisma.$transaction(async (tx) => {
      // Les conditions sur le statut protègent contre deux acceptations simultanées
      const accepted = await tx.offer.updateMany({
        where: { id: offerId, status: OfferStatus.PENDING },
        data: { status: OfferStatus.ACCEPTED },
      });
      const fulfilled = await tx.purchaseRequest.updateMany({
        where: { id: requestId, status: PurchaseRequestStatus.OPEN },
        data: { status: PurchaseRequestStatus.FULFILLED },
      });
      if (accepted.count === 0 || fulfilled.count === 0) {
        throw new ConflictException(
          'Cette offre ou cette demande a changé entre-temps : rechargez la page.',
        );
      }
      await tx.offer.updateMany({
        where: { requestId, status: OfferStatus.PENDING },
        data: { status: OfferStatus.REJECTED },
      });

      return tx.order.create({
        data: {
          ...delivery,
          status: OrderStatus.ACCEPTED,
          totalAmount: lineTotal,
          buyer: { connect: { id: userId } },
          producer: { connect: { id: offer.producerId } },
          offer: { connect: { id: offerId } },
          items: {
            create: {
              product: offer.productId
                ? { connect: { id: offer.productId } }
                : undefined,
              productName: offer.product?.name ?? offer.request.productName,
              // Quantité et prix de l'offre sont exprimés dans l'unité de la demande
              unit: offer.request.unit,
              unitPrice: offer.pricePerUnit,
              quantity: offer.quantity,
              lineTotal,
            },
          },
          events: {
            create: {
              status: OrderStatus.ACCEPTED,
              actorId: userId,
              note: 'Offre acceptée.',
            },
          },
        },
        select: ORDER_DETAIL_SELECT,
      });
    });
    return toOrderDetailView(row);
  }

  // Historique des achats, les plus récents d'abord
  listPurchases(
    userId: string,
    query: ListOrdersQueryDto,
  ): Promise<Page<OrderView>> {
    return this.list({ buyerId: userId }, query);
  }

  // Historique des ventes du producteur, les plus récentes d'abord
  listSales(
    userId: string,
    query: ListOrdersQueryDto,
  ): Promise<Page<OrderView>> {
    return this.list({ producer: { userId } }, query);
  }

  // Seuls l'acheteur et le producteur de la commande peuvent la voir
  async findOne(userId: string, orderId: string): Promise<OrderDetailView> {
    const row = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: ORDER_DETAIL_SELECT,
    });
    if (!row || !partyOf(row, userId)) {
      throw new NotFoundException(ORDER_NOT_FOUND);
    }
    return toOrderDetailView(row);
  }

  async updateStatus(
    userId: string,
    orderId: string,
    dto: UpdateOrderStatusDto,
  ): Promise<OrderDetailView> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        status: true,
        buyerId: true,
        offerId: true,
        stockReserved: true,
        producer: { select: { userId: true } },
        items: { select: { productId: true, quantity: true } },
      },
    });
    const party = order ? partyOf(order, userId) : null;
    if (!order || !party) {
      throw new NotFoundException(ORDER_NOT_FOUND);
    }

    const check = checkOrderTransition(order.status, dto.status, party);
    if (!check.allowed) {
      throw check.reason === 'forbidden'
        ? new ForbiddenException(check.message)
        : new ConflictException(check.message);
    }
    if (requiresNote(dto.status, party) && !dto.note) {
      throw new BadRequestException(
        fieldErrorBody(
          HttpStatus.BAD_REQUEST,
          'note',
          "Indiquez à l'acheteur le motif de l'annulation.",
        ),
      );
    }

    // Seules les commandes du catalogue touchent au stock : pour une offre, l'unité
    // de la demande peut différer de celle du produit, le producteur ajuste son stock lui-même.
    const reserveStock =
      dto.status === OrderStatus.ACCEPTED && order.offerId === null;
    const releaseStock =
      dto.status === OrderStatus.CANCELLED && order.stockReserved;

    const row = await this.prisma.$transaction(async (tx) => {
      // La condition sur le statut protège contre deux changements simultanés
      const updated = await tx.order.updateMany({
        where: { id: orderId, status: order.status },
        data: {
          status: dto.status,
          ...(reserveStock && { stockReserved: true }),
          ...(releaseStock && { stockReserved: false }),
        },
      });
      if (updated.count === 0) {
        throw new ConflictException(
          'La commande a changé entre-temps : rechargez la page.',
        );
      }

      for (const item of order.items) {
        if (!item.productId) continue;
        if (reserveStock) {
          await reserveProductStock(tx, item.productId, item.quantity);
        }
        if (releaseStock) {
          await releaseProductStock(tx, item.productId, item.quantity);
        }
      }

      await tx.orderEvent.create({
        data: {
          order: { connect: { id: orderId } },
          status: dto.status,
          actor: { connect: { id: userId } },
          note: dto.note ?? null,
        },
      });

      return tx.order.findUniqueOrThrow({
        where: { id: orderId },
        select: ORDER_DETAIL_SELECT,
      });
    });
    return toOrderDetailView(row);
  }

  private async list(
    where: Prisma.OrderWhereInput,
    query: ListOrdersQueryDto,
  ): Promise<Page<OrderView>> {
    const { page, pageSize, skip } = resolvePagination(query);
    const filter: Prisma.OrderWhereInput = {
      AND: [where, query.status ? { status: query.status } : {}],
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where: filter,
        select: ORDER_SUMMARY_SELECT,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip,
        take: pageSize,
      }),
      this.prisma.order.count({ where: filter }),
    ]);
    return { items: rows.map(toOrderView), total, page, pageSize };
  }
}

// Retire la quantité commandée du stock, en une seule requête conditionnelle : deux acceptations
// simultanées ne peuvent pas vendre deux fois le même stock. Un stock à zéro rend le produit épuisé.
async function reserveProductStock(
  tx: Prisma.TransactionClient,
  productId: string,
  quantity: number,
): Promise<void> {
  const reserved = await tx.product.updateMany({
    where: {
      id: productId,
      quantity: { gte: quantity },
      status: { not: ProductStatus.ARCHIVED },
    },
    data: { quantity: { decrement: quantity } },
  });
  if (reserved.count === 0) {
    throw new ConflictException(
      'Stock insuffisant pour accepter cette commande, ou produit retiré de la vente. Mettez à jour votre produit ou refusez la commande.',
    );
  }
  await tx.product.updateMany({
    where: { id: productId, quantity: 0, status: ProductStatus.AVAILABLE },
    data: { status: ProductStatus.SOLD_OUT },
  });
}

// Remet en stock la quantité d'une commande annulée. Un produit épuisé redevient disponible ;
// un produit archivé par le producteur reste archivé.
async function releaseProductStock(
  tx: Prisma.TransactionClient,
  productId: string,
  quantity: number,
): Promise<void> {
  await tx.product.updateMany({
    where: { id: productId },
    data: { quantity: { increment: quantity } },
  });
  await tx.product.updateMany({
    where: { id: productId, status: ProductStatus.SOLD_OUT },
    data: { status: ProductStatus.AVAILABLE },
  });
}

// Prix × quantité, calculé en BigInt pour ne jamais perdre en précision
function orderAmount(unitPrice: number, quantity: number): bigint {
  const amount = BigInt(unitPrice) * BigInt(quantity);
  if (amount > MAX_ORDER_AMOUNT) {
    throw new BadRequestException(
      fieldErrorBody(
        HttpStatus.BAD_REQUEST,
        'quantity',
        'Le montant total de la commande est trop élevé.',
      ),
    );
  }
  return amount;
}

function toDeliveryData(dto: DeliveryDto) {
  const deliveryDate = dto.deliveryDate
    ? parseDateOnly(dto.deliveryDate)
    : null;
  if (deliveryDate && deliveryDate < todayUtc()) {
    throw new BadRequestException(
      fieldErrorBody(
        HttpStatus.BAD_REQUEST,
        'deliveryDate',
        'La date de livraison ne peut pas être déjà passée.',
      ),
    );
  }

  return {
    deliveryRegion: dto.deliveryRegion,
    deliveryPrefecture: dto.deliveryPrefecture,
    deliveryCommune: dto.deliveryCommune ?? null,
    deliveryAddress: dto.deliveryAddress,
    deliveryDate,
    note: dto.note ?? null,
  };
}
