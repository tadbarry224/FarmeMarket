import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination';
import { trimToUndefined } from '../../common/transforms';
import { GUINEA_REGION_NAMES } from '../../locations/guinea-locations';

export const OPEN_REQUESTS_SORTS = [
  'relevance', // les plus pertinentes pour le producteur d'abord (par défaut)
  'recent',
] as const;
export type OpenRequestsSort = (typeof OPEN_REQUESTS_SORTS)[number];

// Paramètres d'URL de la liste des demandes ouvertes, consultée par les producteurs.
// Exemple : /requests?categoryId=…&region=Conakry&sort=recent&page=2
// Décorateurs exécutés de bas en haut : voir la remarque dans auth/dto/register.dto.ts
export class ListOpenRequestsQueryDto extends PaginationQueryDto {
  @IsUUID('all', { message: 'Catégorie inconnue.' })
  @IsOptional()
  @Transform(trimToUndefined)
  categoryId?: string;

  // Région de livraison
  @IsIn(GUINEA_REGION_NAMES, { message: 'Région inconnue.' })
  @IsOptional()
  @Transform(trimToUndefined)
  region?: string;

  @IsIn(OPEN_REQUESTS_SORTS, { message: 'Tri invalide : relevance ou recent.' })
  @IsOptional()
  @Transform(trimToUndefined)
  sort?: OpenRequestsSort;
}
