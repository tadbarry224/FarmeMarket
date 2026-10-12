import type { Role } from '../generated/prisma/client';

// Contenu signé dans le jeton de connexion.
// `sub` (subject) est le nom standard du champ qui identifie l'utilisateur.
export interface JwtPayload {
  sub: string;
  roles: Role[];
}
