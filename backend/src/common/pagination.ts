import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { toQueryInteger } from './transforms';

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;

// Une page de résultats
export interface Page<T> {
  items: T[];
  // Nombre total de résultats correspondant aux filtres, toutes pages confondues
  total: number;
  page: number;
  pageSize: number;
}

// Paramètres d'URL ?page=2&pageSize=20, à étendre par les DTO des listes paginées.
// Décorateurs exécutés de bas en haut : voir la remarque dans auth/dto/register.dto.ts
export class PaginationQueryDto {
  @Min(1, { message: 'Le numéro de page doit être au moins 1.' })
  @IsInt({ message: 'Le numéro de page doit être un nombre entier.' })
  @IsOptional()
  @Transform(toQueryInteger)
  page?: number;

  @Max(MAX_PAGE_SIZE, {
    message: `Au plus ${MAX_PAGE_SIZE} résultats par page.`,
  })
  @Min(1, { message: 'Au moins 1 résultat par page.' })
  @IsInt({ message: 'Le nombre de résultats par page doit être un entier.' })
  @IsOptional()
  @Transform(toQueryInteger)
  pageSize?: number;
}

// Valeurs par défaut et décalage à appliquer à la requête Prisma
export function resolvePagination(query: PaginationQueryDto) {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
  return { page, pageSize, skip: (page - 1) * pageSize };
}
