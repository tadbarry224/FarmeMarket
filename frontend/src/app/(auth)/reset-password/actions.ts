"use server";

import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api";
import type { FormState } from "@/lib/form";

export async function resetPassword(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const newPassword = formData.get("newPassword");
  if (newPassword !== formData.get("confirmPassword")) {
    return {
      errors: { confirmPassword: "Les deux mots de passe sont différents." },
    };
  }

  const result = await apiFetch<void>("/auth/reset-password", {
    method: "POST",
    body: { token: formData.get("token"), newPassword },
  });
  if (!result.ok) {
    return { message: result.error.message, errors: result.error.errors };
  }
  redirect("/login?reset=1");
}
