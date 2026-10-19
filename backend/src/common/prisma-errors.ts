import { Prisma } from '../generated/prisma/client';

// Vrai si l'erreur vient d'une contrainte d'unicité de la base (code Prisma P2002),
// par exemple deux enregistrements simultanés de la même valeur unique.
export function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}
