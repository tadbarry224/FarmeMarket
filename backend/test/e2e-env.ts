import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ENV_TEST_PATH = resolve(__dirname, '..', '.env.test');

// Charge backend/.env.test et vérifie que les tests visent bien une base de TEST.
// Les tests e2e vident la base avant chaque test : viser la base de développement
// effacerait toutes les données. Cette vérification rend l'erreur impossible.
export function loadTestEnv(): void {
  if (!existsSync(ENV_TEST_PATH)) {
    throw new Error(
      'Fichier backend/.env.test introuvable : copiez .env.test.example en .env.test et complétez-le.',
    );
  }
  process.loadEnvFile(ENV_TEST_PATH);

  const databaseUrl = process.env.DATABASE_URL;
  const databaseName = databaseUrl
    ? new URL(databaseUrl).pathname.slice(1)
    : '';
  if (!databaseName.endsWith('_test')) {
    throw new Error(
      `Les tests e2e refusent de s'exécuter sur la base « ${databaseName} » : ` +
        'son nom doit se terminer par « _test ». Vérifiez DATABASE_URL (fichier .env.test ou variables du terminal).',
    );
  }
}
