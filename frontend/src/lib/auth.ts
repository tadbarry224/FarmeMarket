import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { apiFetch } from "./api";
import { getSessionToken } from "./session";
import type { User } from "./types";

// Utilisateur connecté, ou null. Mis en cache le temps d'une requête : le menu et la page
// peuvent l'appeler tous les deux sans interroger l'API deux fois.
// Lève une erreur si l'API est injoignable (affichée par la page d'erreur).
export const getCurrentUser = cache(async (): Promise<User | null> => {
  if (!(await getSessionToken())) return null;

  const result = await apiFetch<User>("/users/me");
  if (result.ok) return result.data;
  if (result.error.status === 401) return null;
  throw new Error(result.error.message);
});

// Pour les pages réservées aux utilisateurs connectés. Sans session valide, renvoie vers
// la connexion puis, une fois connecté, vers la page demandée (`currentPath`).
export async function requireUser(currentPath: string): Promise<User> {
  const user = await getCurrentUser();
  if (user) return user;

  const next = encodeURIComponent(currentPath);
  // Un cookie présent mais refusé par l'API signifie une session expirée : il est supprimé
  // par la route /session/expired (un Server Component ne peut pas modifier les cookies).
  redirect(
    (await getSessionToken())
      ? `/session/expired?next=${next}`
      : `/login?next=${next}`,
  );
}

// Destination après connexion : seulement un chemin interne au site
// (empêche un lien piégé de rediriger vers un autre site après la connexion)
export function safeNextPath(next: unknown, fallback = "/account"): string {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
    ? next
    : fallback;
}

// Dans une Server Action : une réponse 401 de l'API signifie que la session a expiré.
// L'utilisateur est alors renvoyé vers la connexion, puis ramené sur `currentPath`.
export function redirectIfSessionExpired(
  status: number,
  currentPath: string,
): void {
  if (status === 401) {
    redirect(`/session/expired?next=${encodeURIComponent(currentPath)}`);
  }
}
