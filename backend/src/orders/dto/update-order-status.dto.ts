import { Transform } from 'class-transformer';
import {
  IsDefined,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { OrderStatus } from '../../generated/prisma/client';
import { trimToUndefined } from '../../common/transforms';

// Tous les statuts sauf PENDING, qui n'est qu'un statut de départ.
// Les changements possibles depuis le statut actuel sont vérifiés par le service (order-transitions.ts).
const TARGET_STATUSES = Object.values(OrderStatus).filter(
  (status) => status !== OrderStatus.PENDING,
);

// Décorateurs exécutés de bas en haut : voir la remarque dans auth/dto/register.dto.ts
export class UpdateOrderStatusDto {
  @IsIn(TARGET_STATUSES, { message: 'Statut invalide.' })
  @IsDefined({ message: 'Le statut est obligatoire.' })
  status: OrderStatus;

  // Motif d'une annulation ou d'un refus, obligatoire quand le producteur annule
  @MaxLength(500, { message: 'Le motif ne peut pas dépasser 500 caractères.' })
  @IsString({ message: 'Motif invalide.' })
  @IsOptional()
  @Transform(trimToUndefined)
  note?: string;
}
