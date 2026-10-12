import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { PASSWORD_MAX_LENGTH } from './register.dto';

// Décorateurs exécutés de bas en haut : voir la remarque dans register.dto.ts
export class LoginDto {
  // Numéro de téléphone (avec ou sans +224) ou adresse e-mail
  @IsNotEmpty({ message: "Le téléphone ou l'e-mail est obligatoire." })
  @IsString({ message: "Le téléphone ou l'e-mail est obligatoire." })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  identifier: string;

  @MaxLength(PASSWORD_MAX_LENGTH, { message: 'Identifiants invalides.' })
  @IsNotEmpty({ message: 'Le mot de passe est obligatoire.' })
  @IsString({ message: 'Le mot de passe est obligatoire.' })
  password: string;
}
