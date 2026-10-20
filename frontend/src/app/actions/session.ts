"use server";

import { redirect } from "next/navigation";
import { deleteSessionToken } from "@/lib/session";

// Déconnexion : le jeton est oublié par le navigateur. Il reste techniquement valide
// jusqu'à son expiration, mais plus personne ne le possède.
export async function logout(): Promise<void> {
  await deleteSessionToken();
  redirect("/");
}
