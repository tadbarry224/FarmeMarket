import { IsDefined, IsEnum } from 'class-validator';
import { ProductStatus } from '../../generated/prisma/client';

// Décorateurs exécutés de bas en haut : voir la remarque dans auth/dto/register.dto.ts
export class UpdateProductStatusDto {
  @IsEnum(ProductStatus, {
    message: 'Statut invalide : disponible, épuisé ou archivé.',
  })
  @IsDefined({ message: 'Le statut est obligatoire.' })
  status: ProductStatus;
}
