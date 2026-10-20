import "server-only";
import {
  type ApiError,
  toApiError,
  unreachableError,
} from "./api-errors";
import { apiUrl } from "./env";
import { getSessionToken } from "./session";

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError };

interface ApiRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
}

// Appel à l'API FarmMarket depuis le serveur Next.js (Server Components, Server Actions).
// Le jeton de session est ajouté automatiquement quand l'utilisateur est connecté.
// Ne lève pas d'exception : le résultat indique le succès ou l'erreur à afficher.
export async function apiFetch<T>(
  path: string,
  { method = "GET", body }: ApiRequestOptions = {},
): Promise<ApiResult<T>> {
  const token = await getSessionToken();
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${apiUrl()}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      // Données propres à l'utilisateur ou changeantes : jamais mises en cache
      cache: "no-store",
    });
  } catch {
    return { ok: false, error: unreachableError() };
  }

  const data = await readJson(response);
  if (!response.ok) {
    return { ok: false, error: toApiError(response.status, data) };
  }
  return { ok: true, data: data as T };
}

// Les réponses 204 (aucun contenu) n'ont pas de corps
async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text === "") return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
