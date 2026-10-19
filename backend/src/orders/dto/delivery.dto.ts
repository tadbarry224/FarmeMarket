import { Transform } from 'class-transformer';
import {
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import { DATE_ONLY } from '../../common/dates';
import { trim, trimToUndefined } from '../../common/transforms';
import { GUINEA_REGION_NAMES } from '../../locations/guinea-locations';
import { IsPrefectureOf } from '../../locations/is-prefecture-of.decorator';

// Livraison et message de l'acheteur, communs aux deux façons de commander
// (produit du catalogue, offre acceptée).
// Pour une offre, le frontend pré-remplit ces champs avec ceux de la demande.
// Décorateurs exécutés de bas en haut : voir la remarque dans auth/dto/register.dto.ts
export class DeliveryDto {
  @IsIn(GUINEA_REGION_NAMES, { message: 'Région inconnue.' })
  @IsString({ message: 'La région de livraison est obligatoire.' })
  @Transform(trim)
  deliveryRegion: string;

  @IsPrefectureOf('deliveryRegion', {
    message: 'Cette préfecture ne fait pas partie de la région choisie.',
  })
  @IsString({ message: 'La préfecture de livraison est obligatoire.' })
  @Transform(trim)
  deliveryPrefecture: string;

  @MaxLength(100, {
    message: 'Le nom de la commune ne peut pas dépasser 100 caractères.',
  })
  @IsString({ message: 'Commune invalide.' })
  @IsOptional()
  @Transform(trimToUndefined)
  deliveryCommune?: string;

  // Quartier, repères… : les adresses ne suivent pas toujours un format normalisé
  @Length(3, 200, {
    message: "L'adresse de livraison doit contenir entre 3 et 200 caractères.",
  })
  @IsString({ message: "L'adresse de livraison est obligatoire." })
  @Transform(trim)
  deliveryAddress: string;

  // Ne peut pas être passée : vérifié par le service
  @IsISO8601({ strict: true }, { message: 'Date invalide.' })
  @Matches(DATE_ONLY, { message: 'Date invalide (format AAAA-MM-JJ).' })
  @IsString({ message: 'Date invalide (format AAAA-MM-JJ).' })
  @IsOptional()
  @Transform(trimToUndefined)
  deliveryDate?: string;

  @MaxLength(1000, {
    message: 'Le message ne peut pas dépasser 1000 caractères.',
  })
  @IsString({ message: 'Message invalide.' })
  @IsOptional()
  @Transform(trimToUndefined)
  note?: string;
}
