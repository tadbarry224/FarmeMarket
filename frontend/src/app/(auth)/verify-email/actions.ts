"use server";

import { apiFetch } from "@/lib/api";
import type { FormState } from "@/lib/form";

export async function verifyEmail(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const result = await apiFetch<void>("/auth/verify-email", {
    method: "POST",
    body: { token: formData.get("token") },
  });
  if (!result.ok) return { message: result.error.message };
  return {
    success: true,
    message: "Votre adresse e-mail est confirmée. Merci !",
  };
}
