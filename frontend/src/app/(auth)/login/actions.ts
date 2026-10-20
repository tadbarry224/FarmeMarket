"use server";

import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { safeNextPath } from "@/lib/auth";
import { type FormState, textField } from "@/lib/form";
import { setSessionToken } from "@/lib/session";
import type { AuthResult } from "@/lib/types";

export async function login(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const identifier = textField(formData, "identifier");

  // L'API accepte le numéro sous toutes ses formes (avec ou sans +224) ou l'adresse e-mail
  const result = await apiFetch<AuthResult>("/auth/login", {
    method: "POST",
    body: { identifier, password: formData.get("password") },
  });

  if (!result.ok) {
    return {
      message: result.error.message,
      errors: result.error.errors,
      values: { identifier },
    };
  }

  await setSessionToken(result.data.accessToken);
  redirect(safeNextPath(formData.get("next")));
}
