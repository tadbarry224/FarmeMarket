import { createHash } from 'node:crypto';
import { AuthTokenType } from '../generated/prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import { AuthTokensService } from './auth-tokens.service';

const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('hex');

describe('AuthTokensService', () => {
  let prisma: {
    $transaction: jest.Mock;
    authToken: {
      deleteMany: jest.Mock;
      create: jest.Mock;
      findUnique: jest.Mock;
      updateMany: jest.Mock;
    };
  };
  let service: AuthTokensService;

  const validToken = {
    id: 'token-1',
    userId: 'user-1',
    type: AuthTokenType.PASSWORD_RESET,
    usedAt: null,
    expiresAt: new Date(Date.now() + 60_000),
  };

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn().mockResolvedValue([]),
      authToken: {
        deleteMany: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    service = new AuthTokensService(prisma as unknown as PrismaService);
  });

  describe('create', () => {
    it("stocke uniquement l'empreinte du jeton renvoyé", async () => {
      const token = await service.create(
        'user-1',
        AuthTokenType.PASSWORD_RESET,
        60_000,
      );

      const { data } = prisma.authToken.create.mock.calls[0][0];
      expect(token).toHaveLength(43); // 32 octets en base64url
      expect(data.tokenHash).toBe(sha256(token));
      expect(data.tokenHash).not.toContain(token);
    });

    it('supprime les jetons précédents non utilisés du même type', async () => {
      await service.create('user-1', AuthTokenType.PASSWORD_RESET, 60_000);

      expect(prisma.authToken.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          type: AuthTokenType.PASSWORD_RESET,
          usedAt: null,
        },
      });
    });

    it('génère un jeton différent à chaque appel', async () => {
      const first = await service.create('u', AuthTokenType.PASSWORD_RESET, 1);
      const second = await service.create('u', AuthTokenType.PASSWORD_RESET, 1);

      expect(first).not.toBe(second);
    });
  });

  describe('consume', () => {
    it("renvoie l'utilisateur et marque le jeton comme utilisé", async () => {
      prisma.authToken.findUnique.mockResolvedValue(validToken);

      const userId = await service.consume('abc', AuthTokenType.PASSWORD_RESET);

      expect(prisma.authToken.findUnique).toHaveBeenCalledWith({
        where: { tokenHash: sha256('abc') },
      });
      expect(userId).toBe('user-1');
      expect(prisma.authToken.updateMany).toHaveBeenCalled();
    });

    it.each([
      ['inconnu', null],
      ['déjà utilisé', { ...validToken, usedAt: new Date() }],
      ['expiré', { ...validToken, expiresAt: new Date(Date.now() - 1) }],
      [
        "d'un autre type",
        { ...validToken, type: AuthTokenType.EMAIL_VERIFICATION },
      ],
    ])('refuse un jeton %s', async (_label, storedToken) => {
      prisma.authToken.findUnique.mockResolvedValue(storedToken);

      await expect(
        service.consume('abc', AuthTokenType.PASSWORD_RESET),
      ).resolves.toBeNull();
      expect(prisma.authToken.updateMany).not.toHaveBeenCalled();
    });

    it('refuse un jeton utilisé au même moment par une autre requête', async () => {
      prisma.authToken.findUnique.mockResolvedValue(validToken);
      prisma.authToken.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.consume('abc', AuthTokenType.PASSWORD_RESET),
      ).resolves.toBeNull();
    });
  });
});
