import { Transform } from 'class-transformer';
import {
  IsDefined,
  IsEnum,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ProductUnit } from '../../generated/prisma/client';
import { DATE_ONLY } from '../../common/dates';
import { trim, trimToUndefined } from '../../common/transforms';
import { GUINEA_REGION_NAMES } from '../../locations/guinea-locations';
import { IsPrefectureOf } from '../../locations/is-prefecture-of.decorator';

// Bornes hautes : évitent les erreurs de saisie (zéros en trop) et les dépassements d'entier en base
export const PRODUCT_MAX_QUANTITY = 10_000_000;
export const PRODUCT_MAX_PRICE_GNF = 1_000_000_000;

// Création d'un produit, ou remplacement complet lors d'une modification (PUT) :
// un champ facultatif absent efface la valeur précédente.
// Décorateurs exécutés de bas en haut : voir la remarque dans auth/dto/register.dto.ts
export class SaveProductDto {
  @Length(2, 100, {
    message: 'Le nom du produit doit contenir entre 2 et 100 caractères.',
  })
  @IsString({ message: 'Le nom du produit est obligatoire.' })
  @Transform(trim)
  name: string;

  @IsUUID('all', { message: 'Catégorie inconnue.' })
  @IsString({ message: 'La catégorie est obligatoire.' })
  categoryId: string;

  @MaxLength(2000, {
    message: 'La description ne peut pas dépasser 2000 caractères.',
  })
  @IsString({ message: 'Description invalide.' })
  @IsOptional()
  @Transform(trimToUndefined)
  description?: string;

  @Max(PRODUCT_MAX_QUANTITY, {
    message: `La quantité ne peut pas dépasser ${PRODUCT_MAX_QUANTITY.toLocaleString('fr-FR')}.`,
  })
  @Min(1, { message: "La quantité doit être d'au moins 1." })
  @IsInt({ message: 'La quantité doit être un nombre entier.' })
  @IsDefined({ message: 'La quantité est obligatoire.' })
  quantity: number;

  @IsEnum(ProductUnit, { message: 'Unité invalide.' })
  @IsDefined({ message: "L'unité est obligatoire." })
  unit: ProductUnit;

  @Max(PRODUCT_MAX_PRICE_GNF, {
    message: `Le prix ne peut pas dépasser ${PRODUCT_MAX_PRICE_GNF.toLocaleString('fr-FR')} GNF.`,
  })
  @Min(1, { message: "Le prix doit être d'au moins 1 GNF." })
  @IsInt({ message: 'Le prix doit être un nombre entier de francs guinéens.' })
  @IsDefined({ message: 'Le prix est obligatoire.' })
  pricePerUnit: number;

  @IsIn(GUINEA_REGION_NAMES, { message: 'Région inconnue.' })
  @IsString({ message: 'La région est obligatoire.' })
  @Transform(trim)
  region: string;

  @IsPrefectureOf('region', {
    message: 'Cette préfecture ne fait pas partie de la région choisie.',
  })
  @IsString({ message: 'La préfecture est obligatoire.' })
  @Transform(trim)
  prefecture: string;

  @MaxLength(100, {
    message: 'Le nom de la commune ne peut pas dépasser 100 caractères.',
  })
  @IsString({ message: 'Commune invalide.' })
  @IsOptional()
  @Transform(trimToUndefined)
  commune?: string;

  // IsISO8601 strict rejette les dates impossibles (ex. 2026-02-30)
  @IsISO8601({ strict: true }, { message: 'Date invalide.' })
  @Matches(DATE_ONLY, { message: 'Date invalide (format AAAA-MM-JJ).' })
  @IsString({ message: 'Date invalide (format AAAA-MM-JJ).' })
  @IsOptional()
  @Transform(trimToUndefined)
  availableFrom?: string;

  @IsISO8601({ strict: true }, { message: 'Date invalide.' })
  @Matches(DATE_ONLY, { message: 'Date invalide (format AAAA-MM-JJ).' })
  @IsString({ message: 'Date invalide (format AAAA-MM-JJ).' })
  @IsOptional()
  @Transform(trimToUndefined)
  availableUntil?: string;

  @MaxLength(100, {
    message: 'La qualité ne peut pas dépasser 100 caractères.',
  })
  @IsString({ message: 'Qualité invalide.' })
  @IsOptional()
  @Transform(trimToUndefined)
  quality?: string;

  @MaxLength(100, {
    message: 'Le conditionnement ne peut pas dépasser 100 caractères.',
  })
  @IsString({ message: 'Conditionnement invalide.' })
  @IsOptional()
  @Transform(trimToUndefined)
  packaging?: string;
}
