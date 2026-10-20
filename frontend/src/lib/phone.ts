// Le champ téléphone affiche le préfixe +224 : l'utilisateur saisit seulement son numéro local.
// Un numéro déjà saisi avec un indicatif (+224…, 00224…) est transmis tel quel.
// L'API se charge ensuite de la normalisation et de la validation.
export const GUINEA_PREFIX = "+224";

export function toApiPhone(input: string): string {
  const value = input.trim();
  if (value === "" || value.startsWith("+") || value.startsWith("00")) {
    return value;
  }
  return `${GUINEA_PREFIX} ${value}`;
}

// Affichage d'un numéro stocké au format +224XXXXXXXXX : « +224 622 12 34 56 »
export function formatPhone(e164: string): string {
  const match = /^\+224(\d{3})(\d{2})(\d{2})(\d{2})$/.exec(e164);
  return match ? `${GUINEA_PREFIX} ${match.slice(1).join(" ")}` : e164;
}
