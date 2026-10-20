"use client";

import { useActionState } from "react";
import { FormAlert } from "@/components/forms/form-alert";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { initialFormState } from "@/lib/form";
import { resetPassword } from "./actions";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction] = useActionState(resetPassword, initialFormState);
  const errors = state.errors ?? {};

  return (
    <form action={formAction} noValidate className="space-y-5">
      <FormAlert state={state} />
      <input type="hidden" name="token" value={token} />
      <Field
        name="newPassword"
        label="Nouveau mot de passe"
        type="password"
        autoComplete="new-password"
        hint="8 caractères minimum."
        error={errors.newPassword}
      />
      <Field
        name="confirmPassword"
        label="Confirmer le nouveau mot de passe"
        type="password"
        autoComplete="new-password"
        error={errors.confirmPassword}
      />
      <SubmitButton pendingLabel="Enregistrement…" className="w-full">
        Enregistrer le nouveau mot de passe
      </SubmitButton>
    </form>
  );
}
