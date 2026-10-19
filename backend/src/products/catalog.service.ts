import {
  BadRequestException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { type Prisma, ProductStatus } from '../generated/prisma/client';
import { parseDateOnly, todayUtc } from '../common/dates';
import { type Page, resolvePagination } from '../common/pagination';
import { fieldErrorBody } from '../common/validation';
import { PrismaService } from '../prisma/prisma.service';
import {
  type CatalogSort,
  type ListProductsQueryDto,
} from './dto/list-products-query.dto';
import {
  PUBLIC_PRODUCT_SELECT,
  type PublicProduct,
  toPublicProduct,
} from './public-product';

// L'identifiant départage les produits à valeur égale : sans lui, l'ordre (et donc
// le contenu des pages) pourrait varier d'une requête à l'autre.
const ORDER_BY: Record<CatalogSort, Prisma.ProductOrderByWithRelationInput[]> =
  {
    recent: [{ createdAt: 'desc' }, { id: 'asc' }],
    price_asc: [{ pricePerUnit: 'asc' }, { id: 'asc' }],
    price_desc: [{ pricePerUnit: 'desc' }, { id: 'asc' }],
    quantity_desc: [{ quantity: 'desc' }, { id: 'asc' }],
  };

// Catalogue public : consultation des produits par les acheteurs et les visiteurs.
@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListProductsQueryDto): Promise<Page<PublicProduct>> {
    if (
      query.minPrice !== undefined &&
      query.maxPrice !== undefined &&
      query.maxPrice < query.minPrice
    ) {
      throw new BadRequestException(
        fieldErrorBody(
          HttpStatus.BAD_REQUEST,
          'maxPrice',
          'Le prix maximum doit être supérieur au prix minimum.',
        ),
      );
    }

    const { page, pageSize, skip } = resolvePagination(query);
    const where = buildWhere(query);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        select: PUBLIC_PRODUCT_SELECT,
        orderBy: ORDER_BY[query.sort ?? 'recent'],
        skip,
        take: pageSize,
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items: rows.map(toPublicProduct), total, page, pageSize };
  }

  // Un produit épuisé reste consultable (lien partagé, historique) ; un produit archivé non.
  async findOne(id: string): Promise<PublicProduct> {
    const row = await this.prisma.product.findFirst({
      where: { id, status: { not: ProductStatus.ARCHIVED } },
      select: PUBLIC_PRODUCT_SELECT,
    });
    if (!row) {
      throw new NotFoundException('Produit introuvable.');
    }
    return toPublicProduct(row);
  }
}

function buildWhere(query: ListProductsQueryDto): Prisma.ProductWhereInput {
  // Seuls les produits en vente dont la période n'est pas terminée apparaissent dans la liste.
  const conditions: Prisma.ProductWhereInput[] = [
    { status: ProductStatus.AVAILABLE },
    { OR: [{ availableUntil: null }, { availableUntil: { gte: todayUtc() } }] },
  ];

  if (query.q) {
    const search = escapeLikePattern(query.q);
    conditions.push({
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ],
    });
  }
  if (query.categoryId) conditions.push({ categoryId: query.categoryId });
  if (query.region) conditions.push({ region: query.region });
  if (query.prefecture) conditions.push({ prefecture: query.prefecture });
  if (query.minPrice !== undefined) {
    conditions.push({ pricePerUnit: { gte: query.minPrice } });
  }
  if (query.maxPrice !== undefined) {
    conditions.push({ pricePerUnit: { lte: query.maxPrice } });
  }
  if (query.minQuantity !== undefined) {
    conditions.push({ quantity: { gte: query.minQuantity } });
  }
  if (query.availableOn) {
    const date = parseDateOnly(query.availableOn);
    conditions.push(
      { OR: [{ availableFrom: null }, { availableFrom: { lte: date } }] },
      { OR: [{ availableUntil: null }, { availableUntil: { gte: date } }] },
    );
  }

  return { AND: conditions };
}

// Prisma traduit `contains` en ILIKE sans échapper les jokers SQL : sans cette fonction,
// une recherche « % » renverrait tous les produits et « _ » remplacerait n'importe quel caractère.
// « \ » est le caractère d'échappement par défaut de LIKE dans PostgreSQL.
export function escapeLikePattern(text: string): string {
  return text.replace(/[\\%_]/g, (char) => `\\${char}`);
}
