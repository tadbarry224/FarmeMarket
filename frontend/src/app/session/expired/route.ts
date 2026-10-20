import { type NextRequest, NextResponse } from "next/server";
import { safeNextPath } from "@/lib/auth";
import { deleteSessionToken } from "@/lib/session";

// Session refusée par l'API (jeton expiré ou invalide) : supprime le cookie puis renvoie
// vers la connexion. Appelée par requireUser, car une page ne peut pas modifier les cookies.
export async function GET(request: NextRequest) {
  await deleteSessionToken();

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("expired", "1");
  loginUrl.searchParams.set(
    "next",
    safeNextPath(request.nextUrl.searchParams.get("next")),
  );
  return NextResponse.redirect(loginUrl);
}
