import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import { loadTestEnv } from './e2e-env';

// Exécuté une seule fois avant tous les tests e2e :
// applique les migrations Prisma à la base de test pour qu'elle ait la même structure que le schéma.
export default function globalSetup(): void {
  loadTestEnv();

  execSync('npx prisma migrate deploy', {
    cwd: resolve(__dirname, '..'),
    env: process.env,
    stdio: 'inherit',
  });
}
