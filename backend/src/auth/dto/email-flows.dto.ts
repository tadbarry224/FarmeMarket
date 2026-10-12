import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from './register.dto';

// Décorateurs exécutés de bas en haut : voir la remarque dans register.dto.ts

const INVALID_LINK = 'Lien invalide.';

export class VerifyEmailDto {
  @MaxLength(100, { message: INVALID_LINK })
  @IsNotEmpty({ message: INVALID_LINK })
  @IsString({ message: INVALID_LINK })
  token: string;
}

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Adresse e-mail invalide.' })
  @IsString({ message: "L'adresse e-mail est obligatoire." })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email: string;
}

export class ResetPasswordDto {
  @MaxLength(100, { message: INVALID_LINK })
  @IsNotEmpty({ message: INVALID_LINK })
  @IsString({ message: INVALID_LINK })
  token: string;

  @MaxLength(PASSWORD_MAX_LENGTH, {
    message: `Le mot de passe ne peut pas dépasser ${PASSWORD_MAX_LENGTH} caractères.`,
  })
  @MinLength(PASSWORD_MIN_LENGTH, {
    message: `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`,
  })
  @IsString({ message: 'Le nouveau mot de passe est obligatoire.' })
  newPassword: string;
}
