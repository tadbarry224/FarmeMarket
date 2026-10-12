import { Injectable, Logger } from '@nestjs/common';
import { getRequiredEnv } from '../common/env';
import { MailService, type MailMessage } from '../mail/mail.service';

// Contenu des e-mails liés au compte. Les liens pointent vers les pages du frontend,
// qui transmettront ensuite le jeton à l'API.
@Injectable()
export class AuthMailerService {
  private readonly logger = new Logger(AuthMailerService.name);
  // Lu au démarrage : le serveur refuse de démarrer si FRONTEND_URL est absent
  private readonly frontendUrl = getRequiredEnv('FRONTEND_URL').replace(
    /\/$/,
    '',
  );

  constructor(private readonly mailService: MailService) {}

  sendEmailVerification(to: string, fullName: string, token: string) {
    return this.sendSafely({
      to,
      subject: 'Confirmez votre adresse e-mail FarmMarket',
      text: [
        `Bonjour ${fullName},`,
        '',
        'Pour confirmer votre adresse e-mail, ouvrez ce lien :',
        this.link('/verify-email', token),
        '',
        'Ce lien est valable 24 heures.',
        "Si vous n'avez pas créé de compte FarmMarket, ignorez cet e-mail.",
      ].join('\n'),
    });
  }

  sendPasswordReset(to: string, fullName: string, token: string) {
    return this.sendSafely({
      to,
      subject: 'Réinitialisation de votre mot de passe FarmMarket',
      text: [
        `Bonjour ${fullName},`,
        '',
        'Pour choisir un nouveau mot de passe, ouvrez ce lien :',
        this.link('/reset-password', token),
        '',
        'Ce lien est valable 30 minutes et ne peut servir qu’une seule fois.',
        "Si vous n'avez pas demandé de réinitialisation, ignorez cet e-mail : votre mot de passe reste inchangé.",
      ].join('\n'),
    });
  }

  private link(path: string, token: string): string {
    return `${this.frontendUrl}${path}?token=${token}`;
  }

  // Un échec d'envoi (serveur SMTP indisponible…) ne doit pas faire échouer l'inscription :
  // il est journalisé, et l'utilisateur peut redemander un lien.
  private async sendSafely(message: MailMessage): Promise<void> {
    try {
      await this.mailService.send(message);
    } catch (error) {
      this.logger.error(
        `Échec de l'envoi de l'e-mail « ${message.subject} »`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
