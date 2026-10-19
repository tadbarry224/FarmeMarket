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
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { JwtPayload } from '../auth/jwt-payload';
import type { Page } from '../common/pagination';
import { CatalogService } from './catalog.service';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import { SaveProductDto } from './dto/save-product.dto';
import { UpdateProductStatusDto } from './dto/update-product-status.dto';
import { type ProductWithCategory, ProductsService } from './products.service';
import type { PublicProduct } from './public-product';

// Un identifiant mal formé ne peut correspondre à aucun produit
const productIdPipe = new ParseUUIDPipe({
  exceptionFactory: () => new NotFoundException('Produit introuvable.'),
});

// Catalogue public (@Public) et gestion de ses annonces par le producteur (@Roles(PRODUCER)).
// Le rôle est indiqué route par route : posé sur la classe, il bloquerait aussi le catalogue public.
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly catalogService: CatalogService,
  ) {}

  // Recherche, filtres, tri et pagination
  @Public()
  @Get()
  list(@Query() query: ListProductsQueryDto): Promise<Page<PublicProduct>> {
    return this.catalogService.list(query);
  }

  @Roles(Role.PRODUCER)
  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: SaveProductDto,
  ): Promise<ProductWithCategory> {
    return this.productsService.create(user.sub, dto);
  }

  // Déclarée avant GET /products/:id, sinon « mine » serait lu comme un identifiant
  @Roles(Role.PRODUCER)
  @Get('mine')
  findMine(@CurrentUser() user: JwtPayload): Promise<ProductWithCategory[]> {
    return this.productsService.findMine(user.sub);
  }

  // Détail d'un produit
  @Public()
  @Get(':id')
  findOne(@Param('id', productIdPipe) id: string): Promise<PublicProduct> {
    return this.catalogService.findOne(id);
  }

  @Roles(Role.PRODUCER)
  @Put(':id')
  replace(
    @CurrentUser() user: JwtPayload,
    @Param('id', productIdPipe) id: string,
    @Body() dto: SaveProductDto,
  ): Promise<ProductWithCategory> {
    return this.productsService.replace(user.sub, id, dto);
  }

  // Disponible, épuisé ou archivé (l'archivage remplace la suppression)
  @Roles(Role.PRODUCER)
  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id', productIdPipe) id: string,
    @Body() dto: UpdateProductStatusDto,
  ): Promise<ProductWithCategory> {
    return this.productsService.updateStatus(user.sub, id, dto.status);
  }
}
