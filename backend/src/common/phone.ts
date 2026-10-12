const GUINEA_COUNTRY_CODE = '224';

// Numéro national guinéen : 9 chiffres, commençant par 6 (mobile) ou 3 (fixe).
const GUINEA_NATIONAL_NUMBER = /^[36]\d{8}$/;

// Format stocké en base, produit par normalizeGuineaPhone.
export const GUINEA_PHONE_E164 = /^\+224[36]\d{8}$/;

// Séparateurs tolérés à la saisie : espaces, points, tirets, parenthèses.
const SEPARATORS = /[\s.\-()]/g;

/**
 * Normalise un numéro de téléphone guinéen au format international +224XXXXXXXXX.
 *
 * Un numéro saisi sans indicatif est considéré comme guinéen (+224 par défaut).
 * Retourne null si le numéro n'est pas un numéro guinéen valide.
 *
 * @example normalizeGuineaPhone('622 12 34 56')      // '+224622123456'
 * @example normalizeGuineaPhone('00224 622-12-34-56') // '+224622123456'
 * @example normalizeGuineaPhone('12345')             // null
 */
export function normalizeGuineaPhone(input: string): string | null {
  const compact = input.replace(SEPARATORS, '');

  let national: string;
  if (compact.startsWith(`+${GUINEA_COUNTRY_CODE}`)) {
    national = compact.slice(GUINEA_COUNTRY_CODE.length + 1);
  } else if (compact.startsWith(`00${GUINEA_COUNTRY_CODE}`)) {
    national = compact.slice(GUINEA_COUNTRY_CODE.length + 2);
  } else if (
    compact.startsWith(GUINEA_COUNTRY_CODE) &&
    compact.length === GUINEA_COUNTRY_CODE.length + 9
  ) {
    // Indicatif saisi sans « + » ni « 00 » : 224622123456
    national = compact.slice(GUINEA_COUNTRY_CODE.length);
  } else {
    national = compact;
  }

  if (!GUINEA_NATIONAL_NUMBER.test(national)) {
    return null;
  }

  return `+${GUINEA_COUNTRY_CODE}${national}`;
}
