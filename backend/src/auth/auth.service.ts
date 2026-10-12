import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { Prisma, type User } from '../generated/prisma/client';
import { normalizeGuineaPhone } from '../common/phone';
import { fieldErrorBody } from '../common/validation';
import { type PublicUser, toPublicUser } from '../users/public-user';
import { UsersService } from '../users/users.service';
import type { ChangePasswordDto } from './dto/change-password.dto';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import type { JwtPayload } from './jwt-payload';

export interface AuthResult {
  accessToken: string;
  user: PublicUser;
}

// Message volontairement identique que le compte existe ou non :
// il ne doit pas permettre de deviner quels numéros ou e-mails sont inscrits.
const INVALID_CREDENTIALS = 'Identifiants invalides.';

@Injectable()
export class AuthService {
  // Empreinte factice vérifiée quand le compte n'existe pas, pour que la réponse
  // prenne le même temps qu'avec un mauvais mot de passe (sinon la durée trahit l'existence du compte).
  private dummyPasswordHash?: Promise<string>;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    if (await this.usersService.findByPhone(dto.phone)) {
      throw new ConflictException(
        fieldErrorBody(
          HttpStatus.CONFLICT,
          'phone',
          'Ce numéro de téléphone est déjà utilisé.',
        ),
      );
    }
    if (dto.email && (await this.usersService.findByEmail(dto.email))) {
      throw new ConflictException(
        fieldErrorBody(
          HttpStatus.CONFLICT,
          'email',
          'Cette adresse e-mail est déjà utilisée.',
        ),
      );
    }

    let user: User;
    try {
      user = await this.usersService.create({
        fullName: dto.fullName,
        phone: dto.phone,
        email: dto.email ?? null,
        passwordHash: await argon2.hash(dto.password),
        roles: dto.roles,
      });
    } catch (error) {
      // Deux inscriptions simultanées avec le même numéro : la contrainte d'unicité de la base tranche
      if (isUniqueConstraintError(error)) {
        throw new ConflictException(
          'Ce numéro de téléphone ou cette adresse e-mail est déjà utilisé.',
        );
      }
      throw error;
    }

    return this.buildAuthResult(user);
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.findByIdentifier(dto.identifier);

    const passwordHash = user?.passwordHash ?? (await this.getDummyHash());
    const passwordMatches = await argon2.verify(passwordHash, dto.password);

    if (!user || !passwordMatches) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    return this.buildAuthResult(user);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      // Compte supprimé alors que son jeton est encore valide
      throw new UnauthorizedException('Vous devez être connecté.');
    }

    if (!(await argon2.verify(user.passwordHash, dto.currentPassword))) {
      throw new BadRequestException(
        fieldErrorBody(
          HttpStatus.BAD_REQUEST,
          'currentPassword',
          'Mot de passe actuel incorrect.',
        ),
      );
    }
    if (dto.newPassword === dto.currentPassword) {
      throw new BadRequestException(
        fieldErrorBody(
          HttpStatus.BAD_REQUEST,
          'newPassword',
          "Le nouveau mot de passe doit être différent de l'actuel.",
        ),
      );
    }

    await this.usersService.updatePasswordHash(
      userId,
      await argon2.hash(dto.newPassword),
    );
  }

  // L'identifiant est un e-mail s'il contient « @ », sinon un numéro de téléphone
  private findByIdentifier(identifier: string): Promise<User | null> {
    if (identifier.includes('@')) {
      return this.usersService.findByEmail(identifier.toLowerCase());
    }

    const phone = normalizeGuineaPhone(identifier);
    return phone ? this.usersService.findByPhone(phone) : Promise.resolve(null);
  }

  private getDummyHash(): Promise<string> {
    this.dummyPasswordHash ??= argon2.hash('farmmarket-dummy-password');
    return this.dummyPasswordHash;
  }

  private async buildAuthResult(user: User): Promise<AuthResult> {
    const payload: JwtPayload = { sub: user.id, roles: user.roles };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: toPublicUser(user),
    };
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}
