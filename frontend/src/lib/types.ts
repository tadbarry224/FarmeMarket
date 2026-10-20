// Données renvoyées par l'API FarmMarket (voir le README principal, section API)

export type Role = "PRODUCER" | "BUYER" | "ADMIN";

export const ROLE_LABELS: Record<Role, string> = {
  PRODUCER: "Producteur",
  BUYER: "Acheteur",
  ADMIN: "Administrateur",
};

// Profil renvoyé par GET /users/me
export interface User {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  emailVerifiedAt: string | null;
  roles: Role[];
  createdAt: string;
}

// Réponse de POST /auth/register et POST /auth/login
export interface AuthResult {
  accessToken: string;
  user: User;
}
