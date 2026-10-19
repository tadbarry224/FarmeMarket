import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  type Prisma,
  ProductStatus,
  PurchaseRequestStatus,
  Role,
} from '../generated/prisma/client';
import type { JwtPayload } from '../auth/jwt-payload';
import { parseDateOnly, todayUtc } from '../common/dates';
import { type Page, resolvePagination } from '../common/pagination';
import { fieldErrorBody } from '../common/validation';
import { PrismaService } from '../prisma/prisma.service';
import { ProducersService } from '../producers/producers.service';
import type { ListOpenRequestsQueryDto } from './dto/list-open-requests-query.dto';
import type { SavePurchaseRequestDto } from './dto/save-purchase-request.dto';
import {
  bestMatch,
  type MatchableProduct,
  type MatchableRequest,
  type MatchResult,
} from './matching';
import {
  BUYER_REQUEST_DETAIL,
  BUYER_REQUEST_SUMMARY,
  type BuyerRequestDetail,
  type BuyerRequestSummary,
  producerRequestSelect,
  type ProducerRequestView,
  toBuyerRequestDetail,
  toBuyerRequestSummary,
  toProducerRequestView,
  VISIBLE_OFFERS,
} from './purchase-request-views';

const REQUEST_NOT_FOUND = 'Demande introuvable.';

// Champs des produits utilisés par le matching
const MATCHABLE_PRODUCT = {
  id: true,
  categoryId: true,
  name: true,
  quantity: true,
  unit: true,
  pricePerUnit: true,
  region: true,
  prefecture: true,
  availableFrom: true,
  availableUntil: true,
} satisfies Prisma.ProductSelect;

// Pertinence d'une demande pour les produits d'un producteur
function matchFor(
  request: MatchableRequestFields,
  products: MatchableProduct[],
): MatchResult {
  return bestMatch({ ...request, categoryId: request.category.id }, products);
}

type MatchableRequestFields = Omit<MatchableRequest, 'categoryId'> & {
  category: { id: string };
};

// Une demande ouverte dont la date souhaitée n'est pas passée : proposée aux producteurs,
// et seule à pouvoir recevoir des offres
export function openRequestWhere(): Prisma.PurchaseRequestWhereInput {
  return {
    status: PurchaseRequestStatus.OPEN,
    OR: [{ desiredDate: null }, { desiredDate: { gte: todayUtc() } }],
  };
}

// Demandes d'achat : publication et gestion par l'acheteur, consultation par les producteurs.
@Injectable()
export class RequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly producersService: ProducersService,
  ) {}

  async create(
    buyerId: string,
    dto: SavePurchaseRequestDto,
  ): Promise<BuyerRequestDetail> {
    const data = await this.toRequestData(dto);
    const row = await this.prisma.purchaseRequest.create({
      data: { ...data, buyer: { connect: { id: buyerId } } },
      select: BUYER_REQUEST_DETAIL,
    });
    return toBuyerRequestDetail(row);
  }

  // Toutes les demandes de l'acheteur, fermées comprises, les plus récentes d'abord
  async findMine(buyerId: string): Promise<BuyerRequestSummary[]> {
    const rows = await this.prisma.purchaseRequest.findMany({
      where: { buyerId },
      select: BUYER_REQUEST_SUMMARY,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });
    return rows.map(toBuyerRequestSummary);
  }

  // Demandes ouvertes proposées à un producteur, avec leur pertinence pour lui.
  // Le score dépend de ses produits : il est calculé ici, puis les demandes sont triées et paginées.
  // Suffisant pour le MVP ; à revoir si le nombre de demandes ouvertes devient très grand.
  async listOpen(
    userId: string,
    query: ListOpenRequestsQueryDto,
  ): Promise<Page<ProducerRequestView>> {
    const producer = await this.producersService.requireProfile(
      userId,
      'consulter les demandes',
    );
    const products = await this.findMatchableProducts(producer.id);

    const rows = await this.prisma.purchaseRequest.findMany({
      where: {
        AND: [
          openRequestWhere(),
          // Un compte à la fois acheteur et producteur ne voit pas ses propres demandes
          { buyerId: { not: userId } },
          query.categoryId ? { categoryId: query.categoryId } : {},
          query.region ? { region: query.region } : {},
        ],
      },
      select: producerRequestSelect(producer.id),
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });

    const views = rows.map((row) =>
      toProducerRequestView(row, matchFor(row, products)),
    );
    if ((query.sort ?? 'relevance') === 'relevance') {
      // Tri stable : à score égal, l'ordre « plus récentes d'abord » est conservé
      views.sort((a, b) => b.match.score - a.match.score);
    }

    const { page, pageSize, skip } = resolvePagination(query);
    return {
      items: views.slice(skip, skip + pageSize),
      total: views.length,
      page,
      pageSize,
    };
  }

  // L'auteur voit sa demande et les offres reçues. Un producteur voit une demande ouverte,
  // ou une demande à laquelle il a répondu (pour suivre son offre). Sinon : introuvable.
  async findOne(
    user: JwtPayload,
    requestId: string,
  ): Promise<BuyerRequestDetail | ProducerRequestView> {
    const request = await this.prisma.purchaseRequest.findUnique({
      where: { id: requestId },
      select: { buyerId: true },
    });
    if (!request) {
      throw new NotFoundException(REQUEST_NOT_FOUND);
    }

    if (request.buyerId === user.sub) {
      const row = await this.prisma.purchaseRequest.findUniqueOrThrow({
        where: { id: requestId },
        select: BUYER_REQUEST_DETAIL,
      });
      return toBuyerRequestDetail(row);
    }

    const producer = user.roles.includes(Role.PRODUCER)
      ? await this.producersService.findByUserId(user.sub)
      : null;
    if (!producer) {
      throw new NotFoundException(REQUEST_NOT_FOUND);
    }

    const row = await this.prisma.purchaseRequest.findUniqueOrThrow({
      where: { id: requestId },
      select: producerRequestSelect(producer.id),
    });
    if (row.status !== PurchaseRequestStatus.OPEN && row.offers.length === 0) {
      throw new NotFoundException(REQUEST_NOT_FOUND);
    }

    const products = await this.findMatchableProducts(producer.id);
    return toProducerRequestView(row, matchFor(row, products));
  }

  // Une demande qui a reçu des offres n'est plus modifiable : les offres répondent
  // à des conditions précises. L'acheteur la ferme et en publie une nouvelle.
  async replace(
    buyerId: string,
    requestId: string,
    dto: SavePurchaseRequestDto,
  ): Promise<BuyerRequestDetail> {
    const request = await this.requireOwnOpenRequest(buyerId, requestId);
    if (request._count.offers > 0) {
      throw new ConflictException(
        'Cette demande a déjà reçu des offres : fermez-la et publiez-en une nouvelle.',
      );
    }

    const data = await this.toRequestData(dto);
    const row = await this.prisma.purchaseRequest.update({
      where: { id: requestId },
      data,
      select: BUYER_REQUEST_DETAIL,
    });
    return toBuyerRequestDetail(row);
  }

  // Les offres en attente restent telles quelles : la demande fermée n'en accepte simplement plus.
  async close(buyerId: string, requestId: string): Promise<BuyerRequestDetail> {
    await this.requireOwnOpenRequest(buyerId, requestId);
    const row = await this.prisma.purchaseRequest.update({
      where: { id: requestId },
      data: { status: PurchaseRequestStatus.CLOSED },
      select: BUYER_REQUEST_DETAIL,
    });
    return toBuyerRequestDetail(row);
  }

  // La demande d'un autre acheteur est signalée comme introuvable : son existence n'est pas révélée
  private async requireOwnOpenRequest(buyerId: string, requestId: string) {
    const request = await this.prisma.purchaseRequest.findFirst({
      where: { id: requestId, buyerId },
      select: {
        status: true,
        _count: { select: { offers: { where: VISIBLE_OFFERS } } },
      },
    });
    if (!request) {
      throw new NotFoundException(REQUEST_NOT_FOUND);
    }
    if (request.status !== PurchaseRequestStatus.OPEN) {
      throw new ConflictException(
        'Cette demande est fermée : elle ne peut plus être modifiée.',
      );
    }
    return request;
  }

  private findMatchableProducts(
    producerId: string,
  ): Promise<MatchableProduct[]> {
    return this.prisma.product.findMany({
      where: { producerId, status: ProductStatus.AVAILABLE },
      select: MATCHABLE_PRODUCT,
    });
  }

  // Vérifie les règles qui dépendent de la base ou de la date du jour,
  // puis prépare les données à enregistrer
  private async toRequestData(dto: SavePurchaseRequestDto) {
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
      select: { id: true },
    });
    if (!category) {
      throw new BadRequestException(
        fieldErrorBody(
          HttpStatus.BAD_REQUEST,
          'categoryId',
          'Catégorie inconnue.',
        ),
      );
    }

    const desiredDate = dto.desiredDate ? parseDateOnly(dto.desiredDate) : null;
    if (desiredDate && desiredDate < todayUtc()) {
      throw new BadRequestException(
        fieldErrorBody(
          HttpStatus.BAD_REQUEST,
          'desiredDate',
          'La date souhaitée ne peut pas être déjà passée.',
        ),
      );
    }

    // Un champ facultatif absent du formulaire efface la valeur enregistrée
    return {
      category: { connect: { id: category.id } },
      productName: dto.productName,
      quantity: dto.quantity,
      unit: dto.unit,
      maxPricePerUnit: dto.maxPricePerUnit ?? null,
      region: dto.region,
      prefecture: dto.prefecture,
      commune: dto.commune ?? null,
      desiredDate,
      quality: dto.quality ?? null,
      details: dto.details ?? null,
    } satisfies Prisma.PurchaseRequestUpdateInput;
  }
}
