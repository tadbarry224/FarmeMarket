import { IsDefined, IsIn } from 'class-validator';
import { OfferStatus } from '../../generated/prisma/client';

// Le producteur peut retirer son offre, l'acheteur peut la refuser.
// L'acceptation viendra avec les commandes (phase 5) : elle créera la commande.
export const OFFER_STATUS_CHANGES = [
  OfferStatus.WITHDRAWN,
  OfferStatus.REJECTED,
] as const;
export type OfferStatusChange = (typeof OFFER_STATUS_CHANGES)[number];

// Décorateurs exécutés de bas en haut : voir la remarque dans auth/dto/register.dto.ts
export class UpdateOfferStatusDto {
  @IsIn(OFFER_STATUS_CHANGES, {
    message: 'Statut invalide : une offre peut être retirée ou refusée.',
  })
  @IsDefined({ message: 'Le statut est obligatoire.' })
  status: OfferStatusChange;
}
