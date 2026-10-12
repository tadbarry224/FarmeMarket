import { BadRequestException, Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { AuthTokenType } from '../generated/prisma/client';
import { UsersService } from '../users/users.service';
import { AuthMailerService } from './auth-mailer.service';
import { AuthTokensService } from './auth-tokens.service';

const PASSWORD_RESET_VALIDITY_MS = 30 * 60 * 1000; // 30 minutes

@Injectable()
export class PasswordResetService {
  constructor(
    private readonly usersService: UsersService,
    private readonly authTokensService: AuthTokensService,
    private readonly authMailer: AuthMailerService,
  ) {}

  // Ne signale jamais si l'adresse existe : le contrôleur renvoie toujours la même réponse.
  // Seule une adresse VÉRIFIÉE reçoit un lien : on n'envoie pas de quoi prendre le contrôle
  // d'un compte à une adresse mal saisie ou appartenant à quelqu'un d'autre.
  async requestReset(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    if (!user?.email || !user.emailVerifiedAt) {
      return;
    }

    const token = await this.authTokensService.create(
      user.id,
      AuthTokenType.PASSWORD_RESET,
      PASSWORD_RESET_VALIDITY_MS,
    );
    // Sans `await` : la durée de la réponse ne doit pas dépendre de l'envoi d'un e-mail
    void this.authMailer.sendPasswordReset(user.email, user.fullName, token);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const userId = await this.authTokensService.consume(
      token,
      AuthTokenType.PASSWORD_RESET,
    );
    if (!userId) {
      throw new BadRequestException(
        'Ce lien de réinitialisation est invalide ou a expiré. Faites une nouvelle demande.',
      );
    }

    await this.usersService.updatePasswordHash(
      userId,
      await argon2.hash(newPassword),
    );
  }
}
