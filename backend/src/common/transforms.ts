// Fonctions à utiliser avec @Transform(...) de class-transformer dans les DTO.

type TransformParams = { value: unknown };

// Retire les espaces en début et fin de saisie
export const trim = ({ value }: TransformParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

// Pour un champ facultatif : retire les espaces, et une saisie vide (champ laissé vide
// dans le formulaire) équivaut à une absence de valeur
export const trimToUndefined = ({ value }: TransformParams): unknown => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

// Pour un paramètre d'URL numérique (?page=2) : les valeurs reçues dans l'URL sont toujours des chaînes.
// Un entier écrit en chiffres est converti en nombre, une saisie vide équivaut à une absence de valeur,
// et toute autre saisie est laissée telle quelle pour être rejetée par @IsInt.
export const toQueryInteger = ({ value }: TransformParams): unknown => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (trimmed === '') return undefined;
  return /^-?\d+$/.test(trimmed) ? Number(trimmed) : value;
};
