import * as argon2 from 'argon2';
import { Role, type PrismaClient } from '../generated/prisma/client';
import {
  readSeedAdminInput,
  seedAdmin,
  type SeedAdminInput,
} from './seed-admin';

const validEnv = {
  ADMIN_PHONE: '655 00 00 00',
  ADMIN_EMAIL: ' Admin@FarmMarket.GN ',
  ADMIN_PASSWORD: 'un-mot-de-passe-solide',
};

describe('readSeedAdminInput', () => {
  it('normalise les valeurs et applique le nom par défaut', () => {
    expect(readSeedAdminInput(validEnv)).toEqual({
      fullName: 'Administrateur FarmMarket',
      phone: '+224655000000',
      email: 'admin@farmmarket.gn',
      password: 'un-mot-de-passe-solide',
    });
  });

  it("accepte l'absence d'e-mail", () => {
    expect(
      readSeedAdminInput({ ...validEnv, ADMIN_EMAIL: '' }).email,
    ).toBeNull();
  });

  it.each([
    [{ ADMIN_PHONE: undefined }, 'ADMIN_PHONE est manquant'],
    [
      { ADMIN_PHONE: '12345' },
      "ADMIN_PHONE n'est pas un numéro guinéen valide",
    ],
    [
      { ADMIN_EMAIL: 'pas-un-email' },
      "ADMIN_EMAIL n'est pas une adresse valide",
    ],
    [{ ADMIN_PASSWORD: 'court' }, 'ADMIN_PASSWORD doit contenir entre 12'],
    [{ ADMIN_PASSWORD: undefined }, 'ADMIN_PASSWORD doit contenir entre 12'],
  ])('rejette une configuration invalide (%o)', (override, message) => {
    expect(() => readSeedAdminInput({ ...validEnv, ...override })).toThrow(
      message,
    );
  });
});

describe('seedAdmin', () => {
  const input: SeedAdminInput = {
    fullName: 'Administrateur FarmMarket',
    phone: '+224655000000',
    email: 'admin@farmmarket.gn',
    password: 'un-mot-de-passe-solide',
  };
  let prisma: { user: { findUnique: jest.Mock; create: jest.Mock } };

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
    };
  });

  const run = () =>
    seedAdmin(prisma as unknown as Pick<PrismaClient, 'user'>, input);

  it('crée un compte ayant uniquement le rôle ADMIN', async () => {
    await run();

    const { data } = prisma.user.create.mock.calls[0][0];
    expect(data.roles).toEqual([Role.ADMIN]);
    expect(data.emailVerifiedAt).toBeInstanceOf(Date);
    expect(await argon2.verify(data.passwordHash, input.password)).toBe(true);
  });

  it("ne modifie rien si l'administrateur existe déjà", async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ roles: [Role.ADMIN] });

    await expect(run()).resolves.toContain('existe déjà');
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('refuse de promouvoir un compte existant non administrateur', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ roles: [Role.BUYER] });

    await expect(run()).rejects.toThrow('compte non administrateur');
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('refuse une adresse e-mail déjà utilisée par un autre compte', async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce(null) // téléphone libre
      .mockResolvedValueOnce({ roles: [Role.BUYER] }); // e-mail pris

    await expect(run()).rejects.toThrow('déjà utilisée');
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
});
