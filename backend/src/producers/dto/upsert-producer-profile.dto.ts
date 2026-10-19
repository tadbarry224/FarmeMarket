import { Transform } from 'class-transformer';
import {
  IsDefined,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { FarmType } from '../../generated/prisma/client';
import { trim, trimToUndefined } from '../../common/transforms';
import { GUINEA_REGION_NAMES } from '../../locations/guinea-locations';
import { IsPrefectureOf } from '../../locations/is-prefecture-of.decorator';

export const PRODUCER_DESCRIPTION_MAX_LENGTH = 1000;

// Création ou remplacement complet du profil producteur (PUT) :
// un champ facultatif absent efface la valeur précédente.
// Décorateurs exécutés de bas en haut : voir la remarque dans auth/dto/register.dto.ts
export class UpsertProducerProfileDto {
  @IsEnum(FarmType, {
    message:
      "Type d'exploitation invalide : cultures, élevage, mixte ou autre.",
  })
  @IsDefined({ message: "Le type d'exploitation est obligatoire." })
  farmType: FarmType;

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

  @MaxLength(200, {
    message: "L'adresse ne peut pas dépasser 200 caractères.",
  })
  @IsString({ message: 'Adresse invalide.' })
  @IsOptional()
  @Transform(trimToUndefined)
  address?: string;

  @MaxLength(PRODUCER_DESCRIPTION_MAX_LENGTH, {
    message: `La description ne peut pas dépasser ${PRODUCER_DESCRIPTION_MAX_LENGTH} caractères.`,
  })
  @IsString({ message: 'Description invalide.' })
  @IsOptional()
  @Transform(trimToUndefined)
  description?: string;

  @MaxLength(200, {
    message: 'Les produits principaux ne peuvent pas dépasser 200 caractères.',
  })
  @IsString({ message: 'Produits principaux invalides.' })
  @IsOptional()
  @Transform(trimToUndefined)
  mainProducts?: string;
}
