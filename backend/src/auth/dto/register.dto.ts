import { Transform } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Role } from '../../generated/prisma/client';
import { GUINEA_PHONE_E164, normalizeGuineaPhone } from '../../common/phone';

// Rôles qu'un utilisateur peut choisir lui-même. ADMIN n'est jamais attribuable à l'inscription.
export const SELF_ASSIGNABLE_ROLES: Role[] = [Role.PRODUCER, Role.BUYER];

export const PASSWORD_MIN_LENGTH = 8;
// Limite haute : évite qu'un mot de passe gigantesque ralentisse volontairement le serveur
export const PASSWORD_MAX_LENGTH = 128;

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

// ⚠ class-validator exécute les décorateurs de BAS en HAUT, et le ValidationPipe s'arrête
// à la première erreur par champ. La vérification de présence (« … est obligatoire »)
// doit donc être placée juste au-dessus de la propriété, les règles de format au-dessus.
export class RegisterDto {
  @Length(2, 100, {
    message: 'Le nom complet doit contenir entre 2 et 100 caractères.',
  })
  @IsString({ message: 'Le nom complet est obligatoire.' })
  @Transform(trim)
  fullName: string;

  // Normalisé en +224XXXXXXXXX ; une saisie invalide est conservée telle quelle pour être rejetée par @Matches
  @Matches(GUINEA_PHONE_E164, {
    message: 'Numéro de téléphone guinéen invalide (ex. 622 12 34 56).',
  })
  @IsString({ message: 'Le numéro de téléphone est obligatoire.' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? (normalizeGuineaPhone(value) ?? value) : value,
  )
  phone: string;

  // Facultatif : une chaîne vide (champ laissé vide dans le formulaire) équivaut à « pas d'e-mail »
  @MaxLength(254, { message: 'Adresse e-mail trop longue.' })
  @IsEmail({}, { message: 'Adresse e-mail invalide.' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;
    const email = value.trim().toLowerCase();
    return email === '' ? undefined : email;
  })
  email?: string;

  @MaxLength(PASSWORD_MAX_LENGTH, {
    message: `Le mot de passe ne peut pas dépasser ${PASSWORD_MAX_LENGTH} caractères.`,
  })
  @MinLength(PASSWORD_MIN_LENGTH, {
    message: `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`,
  })
  @IsString({ message: 'Le mot de passe est obligatoire.' })
  password: string;

  @IsIn(SELF_ASSIGNABLE_ROLES, {
    each: true,
    message:
      'Rôle invalide : seuls « producteur » et « acheteur » sont possibles.',
  })
  @ArrayUnique({ message: 'Un même rôle ne peut pas être choisi deux fois.' })
  @ArrayMinSize(1, {
    message: 'Choisissez au moins un rôle : producteur ou acheteur.',
  })
  @IsArray({ message: 'Choisissez au moins un rôle : producteur ou acheteur.' })
  roles: Role[];
}
