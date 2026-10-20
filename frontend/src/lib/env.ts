import "server-only";

// Adresse de l'API NestJS. Connue du serveur Next.js uniquement : le navigateur ne parle
// jamais directement à l'API (cahier des charges §18).
export function apiUrl(): string {
  const url = process.env.API_URL;
  if (!url) {
    throw new Error(
      "La variable API_URL est manquante : copiez frontend/.env.example en frontend/.env.local.",
    );
  }
  return url.replace(/\/+$/, "");
}
