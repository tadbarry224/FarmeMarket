import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { createValidationPipe } from '../src/common/validation';
import type { MailMessage } from '../src/mail/mail.service';
import { MailService } from '../src/mail/mail.service';
import { PrismaService } from '../src/prisma/prisma.service';

// Remplace l'envoi d'e-mails : les messages sont conservés pour que les tests
// puissent lire les liens qu'ils contiennent.
export class FakeMailService {
  readonly sent: MailMessage[] = [];

  send(message: MailMessage): Promise<void> {
    this.sent.push(message);
    return Promise.resolve();
  }

  // Jeton contenu dans le dernier lien envoyé vers `path` (ex. '/verify-email')
  lastToken(path: string): string {
    const pattern = new RegExp(`${path}\\?token=([\\w-]+)`);
    for (const message of [...this.sent].reverse()) {
      const match = pattern.exec(message.text);
      if (match) return match[1];
    }
    throw new Error(`Aucun e-mail contenant un lien ${path} n'a été envoyé.`);
  }
}

export interface E2eContext {
  app: INestApplication<App>;
  prisma: PrismaService;
  mails: FakeMailService;
}

// Démarre l'application complète (comme main.ts), branchée sur la base de test
export async function createE2eApp(): Promise<E2eContext> {
  const mails = new FakeMailService();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(MailService)
    .useValue(mails)
    .compile();

  const app = moduleRef.createNestApplication<INestApplication<App>>();
  app.useGlobalPipes(createValidationPipe());
  await app.init();

  return { app, prisma: app.get(PrismaService), mails };
}

// Vide toutes les tables : chaque test part d'une base vierge
export async function resetDatabase(prisma: PrismaService): Promise<void> {
  await prisma.$executeRaw`TRUNCATE TABLE "AuthToken", "User" CASCADE`;
}
