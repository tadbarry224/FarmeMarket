import { BadRequestException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { AuthTokenType, Role, type User } from '../generated/prisma/client';
import type { UsersService } from '../users/users.service';
import type { AuthMailerService } from './auth-mailer.service';
import type { AuthTokensService } from './auth-tokens.service';
import { EmailVerificationService } from './email-verification.service';
import { PasswordResetService } from './password-reset.service';

const baseUser: User = {
  id: 'user-1',
  fullName: 'Mamadou Diallo',
  phone: '+224622123456',
  email: 'mamadou@exemple.com',
  emailVerifiedAt: null,
  passwordHash: 'hash',
  roles: [Role.BUYER],
  createdAt: new Date(),
  updatedAt: new Date(),
};
const verifiedUser: User = { ...baseUser, emailVerifiedAt: new Date() };

function createMocks() {
  return {
    usersService: {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      markEmailVerified: jest.fn(),
      updatePasswordHash: jest.fn(),
    },
    authTokensService: {
      create: jest.fn().mockResolvedValue('jeton-en-clair'),
      consume: jest.fn(),
    },
    authMailer: {
      sendEmailVerification: jest.fn().mockResolvedValue(undefined),
      sendPasswordReset: jest.fn().mockResolvedValue(undefined),
    },
  };
}

describe('EmailVerificationService', () => {
  let mocks: ReturnType<typeof createMocks>;
  let service: EmailVerificationService;

  beforeEach(() => {
    mocks = createMocks();
    service = new EmailVerificationService(
      mocks.usersService as unknown as UsersService,
      mocks.authTokensService as unknown as AuthTokensService,
      mocks.authMailer as unknown as AuthMailerService,
    );
  });

  describe('sendVerification', () => {
    it('envoie un lien valable 24 h à une adresse non vérifiée', async () => {
      await service.sendVerification(baseUser);

      expect(mocks.authTokensService.create).toHaveBeenCalledWith(
        'user-1',
        AuthTokenType.EMAIL_VERIFICATION,
        24 * 60 * 60 * 1000,
      );
      expect(mocks.authMailer.sendEmailVerification).toHaveBeenCalledWith(
        'mamadou@exemple.com',
        'Mamadou Diallo',
        'jeton-en-clair',
      );
    });

    it.each([
      ['sans adresse e-mail', { ...baseUser, email: null }],
      ['dont l’adresse est déjà vérifiée', verifiedUser],
    ])("n'envoie rien pour un utilisateur %s", async (_label, user) => {
      await service.sendVerification(user);

      expect(mocks.authTokensService.create).not.toHaveBeenCalled();
      expect(mocks.authMailer.sendEmailVerification).not.toHaveBeenCalled();
    });
  });

  describe('resendVerification', () => {
    it('refuse si le compte n’a pas d’e-mail', async () => {
      mocks.usersService.findById.mockResolvedValue({
        ...baseUser,
        email: null,
      });

      await expect(service.resendVerification('user-1')).rejects.toThrow(
        "Aucune adresse e-mail n'est associée à votre compte.",
      );
    });

    it("refuse si l'adresse est déjà vérifiée", async () => {
      mocks.usersService.findById.mockResolvedValue(verifiedUser);

      await expect(service.resendVerification('user-1')).rejects.toThrow(
        'Votre adresse e-mail est déjà vérifiée.',
      );
    });
  });

  describe('verifyEmail', () => {
    it("marque l'adresse comme vérifiée avec un jeton valide", async () => {
      mocks.authTokensService.consume.mockResolvedValue('user-1');

      await service.verifyEmail('jeton');

      expect(mocks.authTokensService.consume).toHaveBeenCalledWith(
        'jeton',
        AuthTokenType.EMAIL_VERIFICATION,
      );
      expect(mocks.usersService.markEmailVerified).toHaveBeenCalledWith(
        'user-1',
      );
    });

    it('refuse un jeton invalide ou expiré', async () => {
      mocks.authTokensService.consume.mockResolvedValue(null);

      await expect(service.verifyEmail('jeton')).rejects.toThrow(
        BadRequestException,
      );
      expect(mocks.usersService.markEmailVerified).not.toHaveBeenCalled();
    });
  });
});

describe('PasswordResetService', () => {
  let mocks: ReturnType<typeof createMocks>;
  let service: PasswordResetService;

  beforeEach(() => {
    mocks = createMocks();
    service = new PasswordResetService(
      mocks.usersService as unknown as UsersService,
      mocks.authTokensService as unknown as AuthTokensService,
      mocks.authMailer as unknown as AuthMailerService,
    );
  });

  describe('requestReset', () => {
    it('envoie un lien valable 30 min à une adresse vérifiée', async () => {
      mocks.usersService.findByEmail.mockResolvedValue(verifiedUser);

      await service.requestReset('mamadou@exemple.com');

      expect(mocks.authTokensService.create).toHaveBeenCalledWith(
        'user-1',
        AuthTokenType.PASSWORD_RESET,
        30 * 60 * 1000,
      );
      expect(mocks.authMailer.sendPasswordReset).toHaveBeenCalledWith(
        'mamadou@exemple.com',
        'Mamadou Diallo',
        'jeton-en-clair',
      );
    });

    it.each([
      ['inconnue', null],
      ['non vérifiée', baseUser],
    ])(
      "n'envoie rien, sans erreur, pour une adresse %s",
      async (_label, user) => {
        mocks.usersService.findByEmail.mockResolvedValue(user);

        await expect(
          service.requestReset('mamadou@exemple.com'),
        ).resolves.toBeUndefined();
        expect(mocks.authMailer.sendPasswordReset).not.toHaveBeenCalled();
      },
    );
  });

  describe('resetPassword', () => {
    it('enregistre le nouveau mot de passe haché avec un jeton valide', async () => {
      mocks.authTokensService.consume.mockResolvedValue('user-1');

      await service.resetPassword('jeton', 'nouveau-mot-de-passe');

      expect(mocks.authTokensService.consume).toHaveBeenCalledWith(
        'jeton',
        AuthTokenType.PASSWORD_RESET,
      );
      const [userId, hash] = mocks.usersService.updatePasswordHash.mock
        .calls[0] as [string, string];
      expect(userId).toBe('user-1');
      expect(await argon2.verify(hash, 'nouveau-mot-de-passe')).toBe(true);
    });

    it('refuse un jeton invalide, expiré ou déjà utilisé', async () => {
      mocks.authTokensService.consume.mockResolvedValue(null);

      await expect(
        service.resetPassword('jeton', 'nouveau-mot-de-passe'),
      ).rejects.toThrow(BadRequestException);
      expect(mocks.usersService.updatePasswordHash).not.toHaveBeenCalled();
    });
  });
});
