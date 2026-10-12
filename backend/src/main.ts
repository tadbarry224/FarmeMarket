import { existsSync } from 'node:fs';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  // Charge backend/.env (s'il existe) avant l'instanciation des modules,
  // notamment PrismaService qui lit DATABASE_URL dans son constructeur.
  if (existsSync('.env')) {
    process.loadEnvFile('.env');
  }

  const app = await NestFactory.create(AppModule);

  // Valide toutes les données reçues selon les règles des DTO (class-validator)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // supprime les champs non déclarés dans le DTO
      forbidNonWhitelisted: true, // … et rejette la requête s'il y en a
      transform: true, // applique les @Transform (normalisation du téléphone, etc.)
      stopAtFirstError: true, // un seul message d'erreur par champ
    }),
  );

  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();
