import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "./session-cookie";

// Le jeton de connexion renvoyé par l'API est conservé dans un cookie httpOnly :
// le JavaScript du navigateur ne peut pas le lire, ce qui le protège en cas de faille XSS.
// Seul le serveur Next.js le lit, pour l'envoyer à l'API (voir lib/api.ts).

export async function getSessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

export async function setSessionToken(token: string): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    // HTTPS obligatoire en production ; en développement, le site tourne en http://localhost
    secure: process.env.NODE_ENV === "production",
    // Le cookie n'est pas envoyé par les requêtes venant d'autres sites (protection CSRF)
    sameSite: "lax",
    path: "/",
    // Le cookie expire en même temps que le jeton
    expires: tokenExpiry(token),
  });
}

export async function deleteSessionToken(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}


// Date d'expiration inscrite dans le jeton (champ « exp »). La signature n'est pas vérifiée ici :
// c'est l'API qui contrôle la validité du jeton à chaque requête.
function tokenExpiry(token: string): Date | undefined {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1] ?? "", "base64url").toString("utf8"),
    ) as { exp?: unknown };
    return typeof payload.exp === "number"
      ? new Date(payload.exp * 1000)
      : undefined;
  } catch {
    return undefined;
  }
}
