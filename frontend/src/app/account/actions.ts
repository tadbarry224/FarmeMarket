"use server";

import { apiFetch } from "@/lib/api";
import { redirectIfSessionExpired } from "@/lib/auth";
import type { FormState } from "@/lib/form";

export async function resendVerification(): Promise<FormState> {
  const result = await apiFetch<void>("/auth/resend-verification", {
    method: "POST",
  });
  if (!result.ok) {
    redirectIfSessionExpired(result.error.status, "/account");
    return { message: result.error.message };
  }
  return {
    success: true,
    message:
      "Un nouveau lien de confirmation vous a été envoyé. Pensez à regarder dans vos courriers indésirables.",
  };
}

export async function changePassword(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const result = await apiFetch<void>("/auth/password", {
    method: "PATCH",
    body: {
      currentPassword: formData.get("currentPassword"),
      newPassword: formData.get("newPassword"),
    },
  });
  if (!result.ok) {
    redirectIfSessionExpired(result.error.status, "/account");
    return { message: result.error.message, errors: result.error.errors };
  }
  return { success: true, message: "Votre mot de passe a été changé." };
}
