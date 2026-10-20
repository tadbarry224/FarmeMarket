"use client";

import { useActionState } from "react";
import { FormAlert } from "@/components/forms/form-alert";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { initialFormState } from "@/lib/form";
import { changePassword, resendVerification } from "./actions";

export function ResendVerificationForm() {
  const [state, formAction] = useActionState(
    resendVerification,
    initialFormState,
  );
  return (
    <form action={formAction} className="space-y-3">
      <FormAlert state={state} />
      {!state.success && (
        <SubmitButton variant="secondary" pendingLabel="Envoi…">
          Renvoyer le lien de confirmation
        </SubmitButton>
      )}
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, formAction] = useActionState(changePassword, initialFormState);
  const errors = state.errors ?? {};

  return (
    // Après un changement réussi, le formulaire est vidé (comportement par défaut de React)
    <form action={formAction} noValidate className="space-y-5">
      <FormAlert state={state} />
      <Field
        name="currentPassword"
        label="Mot de passe actuel"
        type="password"
        autoComplete="current-password"
        error={errors.currentPassword}
      />
      <Field
        name="newPassword"
        label="Nouveau mot de passe"
        type="password"
        autoComplete="new-password"
        hint="8 caractères minimum."
        error={errors.newPassword}
      />
      <SubmitButton pendingLabel="Enregistrement…">
        Changer le mot de passe
      </SubmitButton>
    </form>
  );
}
