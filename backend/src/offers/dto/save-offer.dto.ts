import { Transform } from 'class-transformer';
import {
  IsDefined,
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
import { trimToUndefined } from '../../common/transforms';
import {
  PRODUCT_MAX_PRICE_GNF,
  PRODUCT_MAX_QUANTITY,
} from '../../products/dto/save-product.dto';

// Offre d'un producteur en réponse à une demande, ou remplacement complet lors d'une modification (PUT).
// Quantité et prix sont exprimés dans l'unité de la demande.
// Décorateurs exécutés de bas en haut : voir la remarque dans auth/dto/register.dto.ts
export class SaveOfferDto {
  // Ne peut pas dépasser la quantité demandée : vérifié par le service
  @Max(PRODUCT_MAX_QUANTITY, {
    message: `La quantité ne peut pas dépasser ${PRODUCT_MAX_QUANTITY.toLocaleString('fr-FR')}.`,
  })
  @Min(1, { message: "La quantité doit être d'au moins 1." })
  @IsInt({ message: 'La quantité doit être un nombre entier.' })
  @IsDefined({ message: 'La quantité est obligatoire.' })
  quantity: number;

  @Max(PRODUCT_MAX_PRICE_GNF, {
    message: `Le prix ne peut pas dépasser ${PRODUCT_MAX_PRICE_GNF.toLocaleString('fr-FR')} GNF.`,
  })
  @Min(1, { message: "Le prix doit être d'au moins 1 GNF." })
  @IsInt({ message: 'Le prix doit être un nombre entier de francs guinéens.' })
  @IsDefined({ message: 'Le prix est obligatoire.' })
  pricePerUnit: number;

  // Un de ses produits du catalogue, facultatif
  @IsUUID('all', { message: 'Produit inconnu.' })
  @IsOptional()
  @Transform(trimToUndefined)
  productId?: string;

  // Date à partir de laquelle le producteur peut livrer
  @IsISO8601({ strict: true }, { message: 'Date invalide.' })
  @Matches(DATE_ONLY, { message: 'Date invalide (format AAAA-MM-JJ).' })
  @IsString({ message: 'Date invalide (format AAAA-MM-JJ).' })
  @IsOptional()
  @Transform(trimToUndefined)
  availableFrom?: string;

  @MaxLength(1000, {
    message: 'Le message ne peut pas dépasser 1000 caractères.',
  })
  @IsString({ message: 'Message invalide.' })
  @IsOptional()
  @Transform(trimToUndefined)
  message?: string;
}
