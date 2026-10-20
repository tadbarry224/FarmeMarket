// État renvoyé par une Server Action de formulaire, lu par useActionState.
export interface FormState {
  // Message général affiché en haut du formulaire
  message?: string;
  // Vrai si l'action a réussi (le message est alors une confirmation)
  success?: boolean;
  // Message par champ
  errors?: Record<string, string>;
  // Valeurs saisies, pour re-remplir le formulaire après une erreur (jamais les mots de passe)
  values?: Record<string, string | string[]>;
}

export const initialFormState: FormState = {};

// Lit un champ texte d'un formulaire
export function textField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

// Valeur texte enregistrée dans FormState.values (pour defaultValue)
export function stringValue(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}
