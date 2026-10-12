/**
 * Lit une variable d'environnement obligatoire.
 * Lève une erreur explicite si elle est absente, pour empêcher le serveur de démarrer
 * avec une configuration incomplète.
 */
export function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`La variable d'environnement ${name} est manquante.`);
  }

  return value;
}
