import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthTokenType, type User } from '../generated/prisma/client';
import { UsersService } from '../users/users.service';
import { AuthMailerService } from './auth-mailer.service';
import { AuthTokensService } from './auth-tokens.service';

const EMAIL_VERIFICATION_VALIDITY_MS = 24 * 60 * 60 * 1000; // 24 heures

@Injectable()
export class EmailVerificationService {
  constructor(
    private readonly usersService: UsersService,
    private readonly authTokensService: AuthTokensService,
    private readonly authMailer: AuthMailerService,
  ) {}

  // Envoie un lien de confirmation si l'utilisateur a un e-mail non vérifié
  async sendVerification(user: User): Promise<void> {
    if (!user.email || user.emailVerifiedAt) {
      return;
    }

    const token = await this.authTokensService.create(
      user.id,
      AuthTokenType.EMAIL_VERIFICATION,
      EMAIL_VERIFICATION_VALIDITY_MS,
    );
    // Sans `await` : la réponse n'attend pas le serveur d'e-mails (les erreurs d'envoi sont journalisées)
    void this.authMailer.sendEmailVerification(
      user.email,
      user.fullName,
      token,
    );
  }

  async resendVerification(userId: string): Promise<void> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Vous devez être connecté.');
    }
    if (!user.email) {
      throw new BadRequestException(
        "Aucune adresse e-mail n'est associée à votre compte.",
      );
    }
    if (user.emailVerifiedAt) {
      throw new BadRequestException('Votre adresse e-mail est déjà vérifiée.');
    }

    await this.sendVerification(user);
  }

  async verifyEmail(token: string): Promise<void> {
    const userId = await this.authTokensService.consume(
      token,
      AuthTokenType.EMAIL_VERIFICATION,
    );
    if (!userId) {
      throw new BadRequestException(
        'Ce lien de confirmation est invalide ou a expiré. Demandez-en un nouveau depuis votre profil.',
      );
    }

    await this.usersService.markEmailVerified(userId);
  }
}
