import { type NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "./lib/session-cookie";

// Vérification rapide avant d'afficher une page réservée : sans cookie de session,
// redirection immédiate vers la connexion. Ce n'est qu'une première barrière : la validité
// de la session et les droits sont vérifiés par l'API à chaque requête (voir lib/auth.ts).
export function proxy(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.next();
  }

  const { pathname, search } = request.nextUrl;
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

// Pages réservées aux utilisateurs connectés
export const config = {
  matcher: ["/account/:path*"],
};
