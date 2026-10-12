import { Injectable, Logger } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';
import { getRequiredEnv } from '../common/env';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

// Envoi des e-mails. Le mode dépend de la configuration :
// - SMTP_HOST défini      → envoi réel par SMTP (production) ;
// - SMTP_HOST non défini  → l'e-mail est affiché dans la console (développement).
// En production, l'absence de SMTP empêche le démarrage : sinon des liens sensibles
// (réinitialisation du mot de passe) finiraient dans les logs du serveur.
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter?: Transporter;
  private readonly from?: string;

  constructor() {
    const host = process.env.SMTP_HOST;

    if (!host) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          'SMTP_HOST est obligatoire en production pour envoyer les e-mails.',
        );
      }
      return;
    }

    this.from = getRequiredEnv('MAIL_FROM');
    this.transporter = createTransport({
      host,
      port: Number(process.env.SMTP_PORT ?? 587),
      auth: {
        user: getRequiredEnv('SMTP_USER'),
        pass: getRequiredEnv('SMTP_PASSWORD'),
      },
    });
  }

  async send(message: MailMessage): Promise<void> {
    if (!this.transporter) {
      this.logger.log(
        [
          'E-mail (mode développement, non envoyé)',
          `  À     : ${message.to}`,
          `  Sujet : ${message.subject}`,
          '',
          message.text,
        ].join('\n'),
      );
      return;
    }

    await this.transporter.sendMail({ from: this.from, ...message });
  }
}
