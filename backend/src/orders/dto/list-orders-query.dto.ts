import { Transform } from 'class-transformer';
import { IsEnum, IsOptional } from 'class-validator';
import { OrderStatus } from '../../generated/prisma/client';
import { PaginationQueryDto } from '../../common/pagination';
import { trimToUndefined } from '../../common/transforms';

// Historique des achats ou des ventes : /orders/purchases?status=SHIPPED&page=2
// Décorateurs exécutés de bas en haut : voir la remarque dans auth/dto/register.dto.ts
export class ListOrdersQueryDto extends PaginationQueryDto {
  @IsEnum(OrderStatus, { message: 'Statut invalide.' })
  @IsOptional()
  @Transform(trimToUndefined)
  status?: OrderStatus;
}
