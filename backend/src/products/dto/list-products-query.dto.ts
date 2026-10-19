import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { DATE_ONLY } from '../../common/dates';
import { PaginationQueryDto } from '../../common/pagination';
import { toQueryInteger, trimToUndefined } from '../../common/transforms';
import {
  GUINEA_PREFECTURE_NAMES,
  GUINEA_REGION_NAMES,
} from '../../locations/guinea-locations';
import {
  PRODUCT_MAX_PRICE_GNF,
  PRODUCT_MAX_QUANTITY,
} from './save-product.dto';

export const CATALOG_SORTS = [
  'recent', // les plus récents d'abord (par défaut)
  'price_asc',
  'price_desc',
  'quantity_desc',
] as const;
export type CatalogSort = (typeof CATALOG_SORTS)[number];

// Paramètres d'URL du catalogue public, tous facultatifs (pagination comprise, voir PaginationQueryDto).
// Exemple : /products?q=riz&region=Kindia&maxPrice=10000&sort=price_asc&page=2
// Décorateurs exécutés de bas en haut : voir la remarque dans auth/dto/register.dto.ts
export class ListProductsQueryDto extends PaginationQueryDto {
  // Recherche dans le nom et la description, sans tenir compte des majuscules
  @MaxLength(100, {
    message: 'La recherche ne peut pas dépasser 100 caractères.',
  })
  @IsString({ message: 'Recherche invalide.' })
  @IsOptional()
  @Transform(trimToUndefined)
  q?: string;

  @IsUUID('all', { message: 'Catégorie inconnue.' })
  @IsOptional()
  @Transform(trimToUndefined)
  categoryId?: string;

  @IsIn(GUINEA_REGION_NAMES, { message: 'Région inconnue.' })
  @IsOptional()
  @Transform(trimToUndefined)
  region?: string;

  // Utilisable seule ou avec la région. Une préfecture d'une autre région donne simplement zéro résultat.
  @IsIn(GUINEA_PREFECTURE_NAMES, { message: 'Préfecture inconnue.' })
  @IsOptional()
  @Transform(trimToUndefined)
  prefecture?: string;

  // Prix par unité, en GNF
  @Max(PRODUCT_MAX_PRICE_GNF, { message: 'Prix minimum trop élevé.' })
  @Min(0, { message: 'Le prix minimum ne peut pas être négatif.' })
  @IsInt({ message: 'Le prix minimum doit être un nombre entier.' })
  @IsOptional()
  @Transform(toQueryInteger)
  minPrice?: number;

  @Max(PRODUCT_MAX_PRICE_GNF, { message: 'Prix maximum trop élevé.' })
  @Min(0, { message: 'Le prix maximum ne peut pas être négatif.' })
  @IsInt({ message: 'Le prix maximum doit être un nombre entier.' })
  @IsOptional()
  @Transform(toQueryInteger)
  maxPrice?: number;

  // Quantité disponible minimale (dans l'unité du produit)
  @Max(PRODUCT_MAX_QUANTITY, { message: 'Quantité minimum trop élevée.' })
  @Min(0, { message: 'La quantité minimum ne peut pas être négative.' })
  @IsInt({ message: 'La quantité minimum doit être un nombre entier.' })
  @IsOptional()
  @Transform(toQueryInteger)
  minQuantity?: number;

  // Produits disponibles à cette date (période de disponibilité qui la contient, ou sans période)
  @IsISO8601({ strict: true }, { message: 'Date invalide.' })
  @Matches(DATE_ONLY, { message: 'Date invalide (format AAAA-MM-JJ).' })
  @IsString({ message: 'Date invalide (format AAAA-MM-JJ).' })
  @IsOptional()
  @Transform(trimToUndefined)
  availableOn?: string;

  @IsIn(CATALOG_SORTS, {
    message: 'Tri invalide : recent, price_asc, price_desc ou quantity_desc.',
  })
  @IsOptional()
  @Transform(trimToUndefined)
  sort?: CatalogSort;
}
