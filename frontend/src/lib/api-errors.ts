// Erreur renvoyée par l'API, ramenée à une forme unique pour les pages et les formulaires.
export interface ApiError {
  // Code HTTP, ou 0 si le serveur n'a pas pu être joint
  status: number;
  message: string;
  // Message par champ de formulaire, ex. { phone: "Numéro de téléphone guinéen invalide…" }
  errors: Record<string, string>;
}

export const UNREACHABLE_MESSAGE =
  "Le serveur FarmMarket est injoignable. Vérifiez votre connexion puis réessayez.";
const SERVER_ERROR_MESSAGE =
  "Une erreur est survenue sur le serveur. Réessayez dans un instant.";

// Construit l'erreur à partir de la réponse de l'API. Les erreurs de l'API ont la forme
// { statusCode, message, errors? } ; `message` peut aussi être une liste.
export function toApiError(status: number, body: unknown): ApiError {
  if (status >= 500) {
    return { status, message: SERVER_ERROR_MESSAGE, errors: {} };
  }

  const record = isRecord(body) ? body : {};
  const message = Array.isArray(record.message)
    ? record.message.filter((m) => typeof m === "string").join(" ")
    : typeof record.message === "string"
      ? record.message
      : "La demande n'a pas pu aboutir.";

  const errors: Record<string, string> = {};
  if (isRecord(record.errors)) {
    for (const [field, value] of Object.entries(record.errors)) {
      if (typeof value === "string") errors[field] = value;
    }
  }

  return { status, message, errors };
}

export function unreachableError(): ApiError {
  return { status: 0, message: UNREACHABLE_MESSAGE, errors: {} };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
