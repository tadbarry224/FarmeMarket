import {
  BadRequestException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma, ProductStatus } from '../generated/prisma/client';
import { parseDateOnly } from '../common/dates';
import { fieldErrorBody } from '../common/validation';
import { PrismaService } from '../prisma/prisma.service';
import { ProducersService } from '../producers/producers.service';
import type { SaveProductDto } from './dto/save-product.dto';

// La catégorie est renvoyée avec le produit pour afficher son nom sans seconde requête
const WITH_CATEGORY = {
  category: { select: { id: true, name: true } },
} satisfies Prisma.ProductInclude;

export type ProductWithCategory = Prisma.ProductGetPayload<{
  include: typeof WITH_CATEGORY;
}>;

const PRODUCT_NOT_FOUND = 'Produit introuvable.';

// Gestion de ses produits par le producteur connecté.
// Chaque opération vérifie que le produit lui appartient.
@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly producersService: ProducersService,
  ) {}

  async create(
    userId: string,
    dto: SaveProductDto,
  ): Promise<ProductWithCategory> {
    const producer = await this.producersService.requireProfile(
      userId,
      'publier un produit',
    );
    const data = await this.toProductData(dto);

    return this.prisma.product.create({
      data: {
        ...data,
        producer: { connect: { id: producer.id } },
      },
      include: WITH_CATEGORY,
    });
  }

  // Tous les produits du producteur, archivés compris, les plus récemment modifiés d'abord
  async findMine(userId: string): Promise<ProductWithCategory[]> {
    const producer = await this.producersService.findByUserId(userId);
    if (!producer) {
      return [];
    }

    return this.prisma.product.findMany({
      where: { producerId: producer.id },
      include: WITH_CATEGORY,
      orderBy: { updatedAt: 'desc' },
    });
  }

  async replace(
    userId: string,
    productId: string,
    dto: SaveProductDto,
  ): Promise<ProductWithCategory> {
    await this.requireOwnProduct(userId, productId);
    const data = await this.toProductData(dto);

    return this.prisma.product.update({
      where: { id: productId },
      data,
      include: WITH_CATEGORY,
    });
  }

  async updateStatus(
    userId: string,
    productId: string,
    status: ProductStatus,
  ): Promise<ProductWithCategory> {
    await this.requireOwnProduct(userId, productId);

    return this.prisma.product.update({
      where: { id: productId },
      data: { status },
      include: WITH_CATEGORY,
    });
  }

  // Un produit d'un autre producteur est signalé comme introuvable :
  // la réponse ne doit pas révéler son existence.
  private async requireOwnProduct(
    userId: string,
    productId: string,
  ): Promise<void> {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, producer: { userId } },
      select: { id: true },
    });
    if (!product) {
      throw new NotFoundException(PRODUCT_NOT_FOUND);
    }
  }

  // Vérifie les règles qui dépendent de plusieurs champs ou de la base,
  // puis prépare les données à enregistrer
  private async toProductData(dto: SaveProductDto) {
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

    const availableFrom = dto.availableFrom
      ? parseDateOnly(dto.availableFrom)
      : null;
    const availableUntil = dto.availableUntil
      ? parseDateOnly(dto.availableUntil)
      : null;
    if (availableFrom && availableUntil && availableUntil < availableFrom) {
      throw new BadRequestException(
        fieldErrorBody(
          HttpStatus.BAD_REQUEST,
          'availableUntil',
          'La date de fin doit être postérieure à la date de début.',
        ),
      );
    }

    // Un champ facultatif absent du formulaire efface la valeur enregistrée
    return {
      name: dto.name,
      category: { connect: { id: category.id } },
      description: dto.description ?? null,
      quantity: dto.quantity,
      unit: dto.unit,
      pricePerUnit: dto.pricePerUnit,
      region: dto.region,
      prefecture: dto.prefecture,
      commune: dto.commune ?? null,
      availableFrom,
      availableUntil,
      quality: dto.quality ?? null,
      packaging: dto.packaging ?? null,
    } satisfies Prisma.ProductUpdateInput;
  }
}
