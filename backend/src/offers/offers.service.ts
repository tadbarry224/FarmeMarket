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
  type Prisma,
  ProductStatus,
} from '../generated/prisma/client';
import { parseDateOnly } from '../common/dates';
import { isUniqueConstraintError } from '../common/prisma-errors';
import { fieldErrorBody } from '../common/validation';
import { PrismaService } from '../prisma/prisma.service';
import { ProducersService } from '../producers/producers.service';
import { openRequestWhere } from '../requests/requests.service';
import type { SaveOfferDto } from './dto/save-offer.dto';
import type { OfferStatusChange } from './dto/update-offer-status.dto';
import { OFFER_VIEW_SELECT, type OfferView, toOfferView } from './offer-view';

// Données d'une offre, vérifiées et prêtes à enregistrer
interface OfferData {
  quantity: number;
  pricePerUnit: number;
  productId: string | null;
  availableFrom: Date | null;
  message: string | null;
}

// Pour une modification : sans produit indiqué, le lien vers l'ancien produit est retiré
function toUpdateInput({
  productId,
  ...fields
}: OfferData): Prisma.OfferUpdateInput {
  return {
    ...fields,
    product: productId ? { connect: { id: productId } } : { disconnect: true },
  };
}

const OFFER_NOT_FOUND = 'Offre introuvable.';
const ALREADY_OFFERED =
  'Vous avez déjà fait une offre pour cette demande : modifiez-la.';
const REQUEST_NOT_ACCEPTING_OFFERS = "Cette demande n'accepte plus d'offres.";

// Offres des producteurs en réponse aux demandes d'achat.
@Injectable()
export class OffersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly producersService: ProducersService,
  ) {}

  async create(
    userId: string,
    requestId: string,
    dto: SaveOfferDto,
  ): Promise<OfferView> {
    const producer = await this.producersService.requireProfile(
      userId,
      'répondre à une demande',
    );

    const request = await this.prisma.purchaseRequest.findUnique({
      where: { id: requestId },
      select: { buyerId: true, quantity: true },
    });
    if (!request) {
      throw new NotFoundException('Demande introuvable.');
    }
    if (request.buyerId === userId) {
      throw new ForbiddenException(
        'Vous ne pouvez pas répondre à votre propre demande.',
      );
    }
    await this.requireRequestAcceptsOffers(requestId);
    const data = await this.toOfferData(producer.id, request.quantity, dto);

    // Une seule offre par producteur et par demande. Une offre retirée peut être renouvelée.
    const existing = await this.prisma.offer.findUnique({
      where: { requestId_producerId: { requestId, producerId: producer.id } },
      select: { id: true, status: true },
    });
    if (existing && existing.status !== OfferStatus.WITHDRAWN) {
      throw new ConflictException(
        existing.status === OfferStatus.PENDING
          ? ALREADY_OFFERED
          : 'Votre offre pour cette demande a déjà reçu une réponse.',
      );
    }
    if (existing) {
      const row = await this.prisma.offer.update({
        where: { id: existing.id },
        data: { ...toUpdateInput(data), status: OfferStatus.PENDING },
        select: OFFER_VIEW_SELECT,
      });
      return toOfferView(row);
    }

    try {
      const { productId, ...fields } = data;
      const row = await this.prisma.offer.create({
        data: {
          ...fields,
          product: productId ? { connect: { id: productId } } : undefined,
          request: { connect: { id: requestId } },
          producer: { connect: { id: producer.id } },
        },
        select: OFFER_VIEW_SELECT,
      });
      return toOfferView(row);
    } catch (error) {
      // Deux envois simultanés de la même offre : la contrainte d'unicité de la base tranche
      if (isUniqueConstraintError(error)) {
        throw new ConflictException(ALREADY_OFFERED);
      }
      throw error;
    }
  }

  // Offres du producteur, retirées comprises, les plus récemment modifiées d'abord
  async findMine(userId: string): Promise<OfferView[]> {
    const rows = await this.prisma.offer.findMany({
      where: { producer: { userId } },
      select: OFFER_VIEW_SELECT,
      orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
    });
    return rows.map(toOfferView);
  }

  // Seule une offre en attente, sur une demande encore ouverte, peut être modifiée
  async replace(
    userId: string,
    offerId: string,
    dto: SaveOfferDto,
  ): Promise<OfferView> {
    const offer = await this.prisma.offer.findFirst({
      where: { id: offerId, producer: { userId } },
      select: {
        status: true,
        producerId: true,
        requestId: true,
        request: { select: { quantity: true } },
      },
    });
    if (!offer) {
      throw new NotFoundException(OFFER_NOT_FOUND);
    }
    if (offer.status !== OfferStatus.PENDING) {
      throw new ConflictException(
        'Seule une offre en attente peut être modifiée.',
      );
    }
    await this.requireRequestAcceptsOffers(offer.requestId);
    const data = await this.toOfferData(
      offer.producerId,
      offer.request.quantity,
      dto,
    );

    const row = await this.prisma.offer.update({
      where: { id: offerId },
      data: toUpdateInput(data),
      select: OFFER_VIEW_SELECT,
    });
    return toOfferView(row);
  }

  // Le producteur retire son offre ; l'acheteur auteur de la demande la refuse.
  // Une personne qui n'est ni l'un ni l'autre ne peut pas savoir que l'offre existe.
  async updateStatus(
    userId: string,
    offerId: string,
    status: OfferStatusChange,
  ): Promise<OfferView> {
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
      select: {
        status: true,
        producer: { select: { userId: true } },
        request: { select: { buyerId: true } },
      },
    });
    const isProducer = offer?.producer.userId === userId;
    const isBuyer = offer?.request.buyerId === userId;
    // Une offre retirée n'est plus visible par l'acheteur
    if (
      !offer ||
      (!isProducer && !isBuyer) ||
      (!isProducer && offer.status === OfferStatus.WITHDRAWN)
    ) {
      throw new NotFoundException(OFFER_NOT_FOUND);
    }

    if (status === OfferStatus.WITHDRAWN && !isProducer) {
      throw new ForbiddenException(
        'Seul le producteur peut retirer son offre.',
      );
    }
    if (status === OfferStatus.REJECTED && !isBuyer) {
      throw new ForbiddenException("Seul l'acheteur peut refuser une offre.");
    }
    if (offer.status !== OfferStatus.PENDING) {
      throw new ConflictException(
        "Cette offre n'est plus en attente : son statut ne peut plus changer.",
      );
    }

    const row = await this.prisma.offer.update({
      where: { id: offerId },
      data: { status },
      select: OFFER_VIEW_SELECT,
    });
    return toOfferView(row);
  }

  private async requireRequestAcceptsOffers(requestId: string): Promise<void> {
    const open = await this.prisma.purchaseRequest.count({
      where: { AND: [{ id: requestId }, openRequestWhere()] },
    });
    if (open === 0) {
      throw new ConflictException(REQUEST_NOT_ACCEPTING_OFFERS);
    }
  }

  // Vérifie les règles qui dépendent de la demande ou de la base,
  // puis prépare les données à enregistrer
  private async toOfferData(
    producerId: string,
    requestedQuantity: number,
    dto: SaveOfferDto,
  ): Promise<OfferData> {
    if (dto.quantity > requestedQuantity) {
      throw new BadRequestException(
        fieldErrorBody(
          HttpStatus.BAD_REQUEST,
          'quantity',
          `L'offre ne peut pas dépasser la quantité demandée (${requestedQuantity.toLocaleString('fr-FR')}).`,
        ),
      );
    }

    if (dto.productId) {
      const product = await this.prisma.product.count({
        where: {
          id: dto.productId,
          producerId,
          status: { not: ProductStatus.ARCHIVED },
        },
      });
      if (product === 0) {
        throw new BadRequestException(
          fieldErrorBody(
            HttpStatus.BAD_REQUEST,
            'productId',
            'Produit inconnu.',
          ),
        );
      }
    }

    // Un champ facultatif absent du formulaire efface la valeur enregistrée
    return {
      quantity: dto.quantity,
      pricePerUnit: dto.pricePerUnit,
      productId: dto.productId ?? null,
      availableFrom: dto.availableFrom
        ? parseDateOnly(dto.availableFrom)
        : null,
      message: dto.message ?? null,
    };
  }
}
