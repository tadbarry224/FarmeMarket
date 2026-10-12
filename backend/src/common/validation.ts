import {
  BadRequestException,
  HttpStatus,
  ValidationPipe,
  type ValidationError,
} from '@nestjs/common';

// Code de la contrainte ajoutée par le ValidationPipe pour un champ non déclaré dans le DTO
const NON_WHITELISTED_CONSTRAINT = 'whitelistValidation';

// Format des erreurs liées à des champs de formulaire.
// `errors` associe à chaque champ son message, pour l'afficher sous le champ concerné.
export interface FieldErrorBody {
  statusCode: number;
  message: string;
  errors: Record<string, string>;
}

// Erreur portant sur un seul champ, levée par un service (ex. numéro déjà utilisé)
export function fieldErrorBody(
  statusCode: HttpStatus,
  field: string,
  message: string,
): FieldErrorBody {
  return { statusCode, message, errors: { [field]: message } };
}

export function toValidationErrorBody(
  errors: ValidationError[],
): FieldErrorBody {
  const fieldErrors: Record<string, string> = {};

  for (const error of errors) {
    const constraints = error.constraints ?? {};
    fieldErrors[error.property] =
      NON_WHITELISTED_CONSTRAINT in constraints
        ? 'Champ non autorisé.'
        : (Object.values(constraints)[0] ?? 'Valeur invalide.');
  }

  return {
    statusCode: HttpStatus.BAD_REQUEST,
    message: 'Certains champs sont invalides.',
    errors: fieldErrors,
  };
}

// Pipe de validation appliqué à toute l'application (et réutilisé par les tests e2e)
export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true, // supprime les champs non déclarés dans le DTO
    forbidNonWhitelisted: true, // … et rejette la requête s'il y en a
    transform: true, // applique les @Transform (normalisation du téléphone, etc.)
    stopAtFirstError: true, // un seul message par champ
    exceptionFactory: (errors) =>
      new BadRequestException(toValidationErrorBody(errors)),
  });
}
