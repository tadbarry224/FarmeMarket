"use server";

import { apiFetch } from "@/lib/api";
import { type FormState, textField } from "@/lib/form";

export async function requestPasswordReset(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = textField(formData, "email");
  // L'API répond de la même façon que l'adresse soit inscrite ou non
  const result = await apiFetch<{ message: string }>("/auth/forgot-password", {
    method: "POST",
    body: { email },
  });
  if (!result.ok) {
    return {
      message: result.error.message,
      errors: result.error.errors,
      values: { email },
    };
  }
  return { success: true, message: result.data.message };
}
