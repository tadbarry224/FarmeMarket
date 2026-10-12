import type { User } from '../generated/prisma/client';

// Utilisateur tel qu'il peut être renvoyé par l'API : sans l'empreinte du mot de passe.
export type PublicUser = Omit<User, 'passwordHash'>;

export function toPublicUser(user: User): PublicUser {
  // Le préfixe « _ » indique une variable volontairement inutilisée : on l'extrait pour l'exclure
  const { passwordHash: _passwordHash, ...publicUser } = user;
  return publicUser;
}
