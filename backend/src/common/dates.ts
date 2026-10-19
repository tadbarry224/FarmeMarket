// Dates sans heure (période de disponibilité, date de livraison souhaitée…),
// stockées dans des colonnes PostgreSQL de type date.

// Format attendu à la saisie, ex. 2026-11-15
export const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

// « 2026-11-15 » → minuit UTC, pour que la date enregistrée ne dépende pas du fuseau du serveur
export function parseDateOnly(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

// Date du jour à minuit UTC, comparable aux colonnes de type date.
// La Guinée est à l'heure UTC toute l'année : la date UTC est donc la date locale.
export function todayUtc(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}
