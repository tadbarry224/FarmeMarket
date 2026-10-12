// Crée le compte administrateur dédié à partir des variables ADMIN_* de backend/.env.
// Usage : npm run seed:admin
//
// Règles :
// - le compte créé a UNIQUEMENT le rôle ADMIN (séparé de tout compte personnel) ;
// - aucun compte existant n'est promu administrateur ;
// - relancer le script est sans danger : un administrateur déjà créé n'est pas modifié.
import { existsSync } from 'node:fs';
import * as argon2 from 'argon2';
import { isEmail } from 'class-validator';
import { normalizeGuineaPhone } from '../common/phone';
import { PASSWORD_MAX_LENGTH } from '../auth/dto/register.dto';
import { Role, type PrismaClient } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// Plus exigeant que pour un compte normal (8) : ce compte a tous les droits
export const ADMIN_PASSWORD_MIN_LENGTH = 12;
const DEFAULT_ADMIN_FULL_NAME = 'Administrateur FarmMarket';

export interface SeedAdminInput {
  fullName: string;
  phone: string;
  email: string | null;
  password: string;
}

// Lit et valide les variables ADMIN_*. Lève une erreur explicite en cas de problème.
export function readSeedAdminInput(
  env: Record<string, string | undefined>,
): SeedAdminInput {
  const rawPhone = env.ADMIN_PHONE?.trim();
  if (!rawPhone) {
    throw new Error('ADMIN_PHONE est manquant dans backend/.env.');
  }
  const phone = normalizeGuineaPhone(rawPhone);
  if (!phone) {
    throw new Error(
      `ADMIN_PHONE n'est pas un numéro guinéen valide : « ${rawPhone} ».`,
    );
  }

  const email = env.ADMIN_EMAIL?.trim().toLowerCase() || null;
  if (email && !isEmail(email)) {
    throw new Error(`ADMIN_EMAIL n'est pas une adresse valide : « ${email} ».`);
  }

  const password = env.ADMIN_PASSWORD ?? '';
  if (
    password.length < ADMIN_PASSWORD_MIN_LENGTH ||
    password.length > PASSWORD_MAX_LENGTH
  ) {
    throw new Error(
      `ADMIN_PASSWORD doit contenir entre ${ADMIN_PASSWORD_MIN_LENGTH} et ${PASSWORD_MAX_LENGTH} caractères.`,
    );
  }

  const fullName = env.ADMIN_FULL_NAME?.trim() || DEFAULT_ADMIN_FULL_NAME;

  return { fullName, phone, email, password };
}

// Crée le compte administrateur et renvoie un message décrivant le résultat
export async function seedAdmin(
  prisma: Pick<PrismaClient, 'user'>,
  input: SeedAdminInput,
): Promise<string> {
  const existing = await prisma.user.findUnique({
    where: { phone: input.phone },
  });
  if (existing) {
    if (existing.roles.includes(Role.ADMIN)) {
      return `Le compte administrateur ${input.phone} existe déjà : rien n'a été modifié.`;
    }
    throw new Error(
      `Le numéro ${input.phone} appartient déjà à un compte non administrateur. ` +
        'Utilisez un numéro dédié au compte administrateur.',
    );
  }

  if (
    input.email &&
    (await prisma.user.findUnique({ where: { email: input.email } }))
  ) {
    throw new Error(
      `L'adresse ${input.email} est déjà utilisée par un autre compte.`,
    );
  }

  await prisma.user.create({
    data: {
      fullName: input.fullName,
      phone: input.phone,
      email: input.email,
      // Adresse fournie par l'exploitant de la plateforme lui-même : considérée comme vérifiée,
      // ce qui permet de réinitialiser le mot de passe administrateur par e-mail.
      emailVerifiedAt: input.email ? new Date() : null,
      passwordHash: await argon2.hash(input.password),
      roles: [Role.ADMIN],
    },
  });

  return (
    `Compte administrateur créé : ${input.fullName} (${input.phone}).\n` +
    'Pensez à retirer ADMIN_PASSWORD de backend/.env.'
  );
}

async function main(): Promise<void> {
  if (existsSync('.env')) {
    process.loadEnvFile('.env');
  }

  const prisma = new PrismaService();
  try {
    console.log(
      `✔ ${await seedAdmin(prisma, readSeedAdminInput(process.env))}`,
    );
  } catch (error) {
    console.error(
      `✘ ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuté uniquement en ligne de commande, pas lors d'un import (tests)
if (require.main === module) {
  void main();
}
