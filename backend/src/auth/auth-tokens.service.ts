import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { AuthTokenType } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// 32 octets aléatoires : impossible à deviner, même par force brute
const TOKEN_BYTES = 32;

// Le jeton est aléatoire et long : un hachage rapide (SHA-256) suffit, contrairement
// aux mots de passe choisis par des humains qui exigent un algorithme lent (argon2).
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// Jetons à usage unique envoyés par e-mail (vérification d'adresse, réinitialisation du mot de passe).
// Seule leur empreinte est stockée : une fuite de la base ne permet pas de les utiliser.
@Injectable()
export class AuthTokensService {
  constructor(private readonly prisma: PrismaService) {}

  // Crée un jeton et renvoie sa valeur en clair, à envoyer à l'utilisateur.
  // Les jetons précédents du même type, non utilisés, sont supprimés : seul le dernier lien envoyé fonctionne.
  async create(
    userId: string,
    type: AuthTokenType,
    validityMs: number,
  ): Promise<string> {
    const token = randomBytes(TOKEN_BYTES).toString('base64url');

    await this.prisma.$transaction([
      this.prisma.authToken.deleteMany({
        where: { userId, type, usedAt: null },
      }),
      this.prisma.authToken.create({
        data: {
          userId,
          type,
          tokenHash: hashToken(token),
          expiresAt: new Date(Date.now() + validityMs),
        },
      }),
    ]);

    return token;
  }

  // Utilise un jeton : renvoie l'identifiant de l'utilisateur s'il est valide, null sinon
  // (inconnu, mauvais type, expiré ou déjà utilisé).
  async consume(token: string, type: AuthTokenType): Promise<string | null> {
    const authToken = await this.prisma.authToken.findUnique({
      where: { tokenHash: hashToken(token) },
    });

    if (
      !authToken ||
      authToken.type !== type ||
      authToken.usedAt ||
      authToken.expiresAt < new Date()
    ) {
      return null;
    }

    // Condition `usedAt: null` dans la mise à jour : si deux requêtes utilisent le même jeton
    // au même moment, une seule réussit.
    const { count } = await this.prisma.authToken.updateMany({
      where: { id: authToken.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    return count === 1 ? authToken.userId : null;
  }
}
