import { Logger } from '@nestjs/common';
import { MailService } from './mail.service';

describe('MailService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.SMTP_HOST;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("affiche l'e-mail dans la console quand SMTP n'est pas configuré", async () => {
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation();

    await new MailService().send({
      to: 'mamadou@exemple.com',
      subject: 'Sujet de test',
      text: 'Lien : http://localhost:3000/test',
    });

    const output = String(log.mock.calls[0][0]);
    expect(output).toContain('mamadou@exemple.com');
    expect(output).toContain('Lien : http://localhost:3000/test');
    log.mockRestore();
  });

  it("refuse de démarrer en production si SMTP n'est pas configuré", () => {
    process.env.NODE_ENV = 'production';

    expect(() => new MailService()).toThrow(
      'SMTP_HOST est obligatoire en production',
    );
  });

  it('exige les identifiants SMTP quand SMTP_HOST est défini', () => {
    process.env.SMTP_HOST = 'smtp.exemple.com';
    process.env.MAIL_FROM = 'FarmMarket <noreply@exemple.com>';
    delete process.env.SMTP_USER;

    expect(() => new MailService()).toThrow('SMTP_USER est manquante');
  });
});
