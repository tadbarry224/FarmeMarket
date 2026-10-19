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
import {
  PRODUCT_MAX_PRICE_GNF,
  PRODUCT_MAX_QUANTITY,
} from '../../products/dto/save-product.dto';

// Publication d'une demande d'achat, ou remplacement complet lors d'une modification (PUT) :
// un champ facultatif absent efface la valeur précédente.
// Décorateurs exécutés de bas en haut : voir la remarque dans auth/dto/register.dto.ts
export class SavePurchaseRequestDto {
  @IsUUID('all', { message: 'Catégorie inconnue.' })
  @IsString({ message: 'La catégorie est obligatoire.' })
  categoryId: string;

  @Length(2, 100, {
    message: 'Le produit recherché doit contenir entre 2 et 100 caractères.',
  })
  @IsString({ message: 'Le produit recherché est obligatoire.' })
  @Transform(trim)
  productName: string;

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

  // Budget maximum par unité, en GNF
  @Max(PRODUCT_MAX_PRICE_GNF, {
    message: `Le budget ne peut pas dépasser ${PRODUCT_MAX_PRICE_GNF.toLocaleString('fr-FR')} GNF.`,
  })
  @Min(1, { message: "Le budget doit être d'au moins 1 GNF." })
  @IsInt({
    message: 'Le budget doit être un nombre entier de francs guinéens.',
  })
  @IsOptional()
  maxPricePerUnit?: number;

  // Lieu de livraison
  @IsIn(GUINEA_REGION_NAMES, { message: 'Région inconnue.' })
  @IsString({ message: 'La région de livraison est obligatoire.' })
  @Transform(trim)
  region: string;

  @IsPrefectureOf('region', {
    message: 'Cette préfecture ne fait pas partie de la région choisie.',
  })
  @IsString({ message: 'La préfecture de livraison est obligatoire.' })
  @Transform(trim)
  prefecture: string;

  @MaxLength(100, {
    message: 'Le nom de la commune ne peut pas dépasser 100 caractères.',
  })
  @IsString({ message: 'Commune invalide.' })
  @IsOptional()
  @Transform(trimToUndefined)
  commune?: string;

  // Date de livraison souhaitée. Elle ne peut pas être passée : vérifié par le service.
  @IsISO8601({ strict: true }, { message: 'Date invalide.' })
  @Matches(DATE_ONLY, { message: 'Date invalide (format AAAA-MM-JJ).' })
  @IsString({ message: 'Date invalide (format AAAA-MM-JJ).' })
  @IsOptional()
  @Transform(trimToUndefined)
  desiredDate?: string;

  @MaxLength(100, {
    message: 'La qualité ne peut pas dépasser 100 caractères.',
  })
  @IsString({ message: 'Qualité invalide.' })
  @IsOptional()
  @Transform(trimToUndefined)
  quality?: string;

  @MaxLength(2000, {
    message: 'Les précisions ne peuvent pas dépasser 2000 caractères.',
  })
  @IsString({ message: 'Précisions invalides.' })
  @IsOptional()
  @Transform(trimToUndefined)
  details?: string;
}
