import { IsDefined, IsIn } from 'class-validator';
import { PurchaseRequestStatus } from '../../generated/prisma/client';

// L'acheteur peut seulement fermer sa demande. Le statut FULFILLED sera posé
// par l'acceptation d'une offre (phase 5 : commandes).
// Décorateurs exécutés de bas en haut : voir la remarque dans auth/dto/register.dto.ts
export class ClosePurchaseRequestDto {
  @IsIn([PurchaseRequestStatus.CLOSED], {
    message: 'Statut invalide : une demande peut seulement être fermée.',
  })
  @IsDefined({ message: 'Le statut est obligatoire.' })
  status: typeof PurchaseRequestStatus.CLOSED;
}
