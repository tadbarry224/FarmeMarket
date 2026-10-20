"use server";

import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { safeNextPath } from "@/lib/auth";
import { type FormState, textField } from "@/lib/form";
import { toApiPhone } from "@/lib/phone";
import { setSessionToken } from "@/lib/session";
import type { AuthResult } from "@/lib/types";

export async function register(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = {
    fullName: textField(formData, "fullName"),
    phone: textField(formData, "phone"),
    email: textField(formData, "email"),
    roles: formData.getAll("roles").filter((r) => typeof r === "string"),
  };

  const result = await apiFetch<AuthResult>("/auth/register", {
    method: "POST",
    body: {
      fullName: values.fullName,
      phone: toApiPhone(values.phone),
      // Champ facultatif : une saisie vide signifie « pas d'e-mail » pour l'API
      email: values.email,
      password: formData.get("password"),
      roles: values.roles,
    },
  });

  if (!result.ok) {
    return {
      message: result.error.message,
      errors: result.error.errors,
      values,
    };
  }

  await setSessionToken(result.data.accessToken);
  redirect(safeNextPath(formData.get("next"), "/account?welcome=1"));
}
