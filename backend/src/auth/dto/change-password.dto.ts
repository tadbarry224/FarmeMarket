import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from './register.dto';

// Décorateurs exécutés de bas en haut : voir la remarque dans register.dto.ts
export class ChangePasswordDto {
  @MaxLength(PASSWORD_MAX_LENGTH, {
    message: 'Mot de passe actuel incorrect.',
  })
  @IsNotEmpty({ message: 'Le mot de passe actuel est obligatoire.' })
  @IsString({ message: 'Le mot de passe actuel est obligatoire.' })
  currentPassword: string;

  @MaxLength(PASSWORD_MAX_LENGTH, {
    message: `Le mot de passe ne peut pas dépasser ${PASSWORD_MAX_LENGTH} caractères.`,
  })
  @MinLength(PASSWORD_MIN_LENGTH, {
    message: `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`,
  })
  @IsString({ message: 'Le nouveau mot de passe est obligatoire.' })
  newPassword: string;
}
