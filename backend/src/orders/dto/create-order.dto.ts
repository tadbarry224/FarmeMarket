import { IsDefined, IsInt, IsString, IsUUID, Max, Min } from 'class-validator';
import { PRODUCT_MAX_QUANTITY } from '../../products/dto/save-product.dto';
import { DeliveryDto } from './delivery.dto';

// Commande d'un produit du catalogue, dans l'unité du produit.
// Décorateurs exécutés de bas en haut : voir la remarque dans auth/dto/register.dto.ts
export class CreateOrderDto extends DeliveryDto {
  @IsUUID('all', { message: 'Produit introuvable.' })
  @IsString({ message: 'Le produit est obligatoire.' })
  productId: string;

  // Ne peut pas dépasser le stock du produit : vérifié par le service
  @Max(PRODUCT_MAX_QUANTITY, {
    message: `La quantité ne peut pas dépasser ${PRODUCT_MAX_QUANTITY.toLocaleString('fr-FR')}.`,
  })
  @Min(1, { message: "La quantité doit être d'au moins 1." })
  @IsInt({ message: 'La quantité doit être un nombre entier.' })
  @IsDefined({ message: 'La quantité est obligatoire.' })
  quantity: number;
}
