import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { Role, type User } from '../generated/prisma/client';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import type { RegisterDto } from './dto/register.dto';

const PASSWORD = 'motdepasse123';

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: jest.Mocked<
    Pick<UsersService, 'findByPhone' | 'findByEmail' | 'create'>
  >;
  let jwtService: JwtService;
  let existingUser: User;

  // Données telles qu'elles arrivent après le ValidationPipe (déjà normalisées)
  const registerDto = {
    fullName: 'Mamadou Diallo',
    phone: '+224622123456',
    email: 'mamadou@exemple.com',
    password: PASSWORD,
    roles: [Role.PRODUCER],
  } satisfies RegisterDto;

  beforeAll(async () => {
    existingUser = {
      id: 'user-1',
      fullName: 'Mamadou Diallo',
      phone: '+224622123456',
      email: 'mamadou@exemple.com',
      emailVerifiedAt: null,
      passwordHash: await argon2.hash(PASSWORD),
      roles: [Role.PRODUCER],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  beforeEach(() => {
    // La base est simulée : ces tests vérifient uniquement les règles métier d'AuthService
    usersService = {
      findByPhone: jest.fn().mockResolvedValue(null),
      findByEmail: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
    };
    jwtService = new JwtService({ secret: 'secret-de-test-uniquement' });
    authService = new AuthService(
      usersService as unknown as UsersService,
      jwtService,
    );
  });

  describe('register', () => {
    it('crée le compte avec un mot de passe haché et renvoie un jeton', async () => {
      usersService.create.mockResolvedValue(existingUser);

      const result = await authService.register(registerDto);

      const createdWith = usersService.create.mock.calls[0][0];
      expect(createdWith.passwordHash).not.toBe(PASSWORD);
      expect(await argon2.verify(createdWith.passwordHash, PASSWORD)).toBe(
        true,
      );

      expect(jwtService.verify(result.accessToken)).toMatchObject({
        sub: 'user-1',
        roles: [Role.PRODUCER],
      });
    });

    it("ne renvoie jamais l'empreinte du mot de passe", async () => {
      usersService.create.mockResolvedValue(existingUser);

      const result = await authService.register(registerDto);

      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('refuse un numéro de téléphone déjà utilisé', async () => {
      usersService.findByPhone.mockResolvedValue(existingUser);

      await expect(authService.register(registerDto)).rejects.toThrow(
        new ConflictException('Ce numéro de téléphone est déjà utilisé.'),
      );
      expect(usersService.create).not.toHaveBeenCalled();
    });

    it('refuse une adresse e-mail déjà utilisée', async () => {
      usersService.findByEmail.mockResolvedValue(existingUser);

      await expect(authService.register(registerDto)).rejects.toThrow(
        new ConflictException('Cette adresse e-mail est déjà utilisée.'),
      );
      expect(usersService.create).not.toHaveBeenCalled();
    });

    it("enregistre l'e-mail à null quand il n'est pas fourni", async () => {
      usersService.create.mockResolvedValue({ ...existingUser, email: null });

      await authService.register({ ...registerDto, email: undefined });

      expect(usersService.findByEmail).not.toHaveBeenCalled();
      expect(usersService.create.mock.calls[0][0].email).toBeNull();
    });
  });

  describe('login', () => {
    it('connecte avec le numéro de téléphone, quel que soit son format', async () => {
      usersService.findByPhone.mockResolvedValue(existingUser);

      const result = await authService.login({
        identifier: '622 12 34 56',
        password: PASSWORD,
      });

      expect(usersService.findByPhone).toHaveBeenCalledWith('+224622123456');
      expect(result.user.id).toBe('user-1');
    });

    it("connecte avec l'e-mail, sans tenir compte des majuscules", async () => {
      usersService.findByEmail.mockResolvedValue(existingUser);

      const result = await authService.login({
        identifier: 'Mamadou@Exemple.com',
        password: PASSWORD,
      });

      expect(usersService.findByEmail).toHaveBeenCalledWith(
        'mamadou@exemple.com',
      );
      expect(result.accessToken).toEqual(expect.any(String));
    });

    it('refuse un mauvais mot de passe', async () => {
      usersService.findByPhone.mockResolvedValue(existingUser);

      await expect(
        authService.login({
          identifier: '622123456',
          password: 'mauvais-mot-de-passe',
        }),
      ).rejects.toThrow(new UnauthorizedException('Identifiants invalides.'));
    });

    it("renvoie le même message quand le compte n'existe pas", async () => {
      await expect(
        authService.login({ identifier: '622999999', password: PASSWORD }),
      ).rejects.toThrow(new UnauthorizedException('Identifiants invalides.'));
    });

    it('renvoie le même message pour un identifiant mal formé', async () => {
      await expect(
        authService.login({ identifier: 'nimportequoi', password: PASSWORD }),
      ).rejects.toThrow(new UnauthorizedException('Identifiants invalides.'));
      expect(usersService.findByPhone).not.toHaveBeenCalled();
    });
  });
});
