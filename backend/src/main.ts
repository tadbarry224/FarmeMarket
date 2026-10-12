import { existsSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  // Charge backend/.env (s'il existe) avant l'instanciation des modules,
  // notamment PrismaService qui lit DATABASE_URL dans son constructeur.
  if (existsSync('.env')) {
    process.loadEnvFile('.env');
  }

  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();
