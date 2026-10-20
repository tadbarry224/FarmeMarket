"use client";

import { useActionState } from "react";
import { FormAlert } from "@/components/forms/form-alert";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { initialFormState, stringValue } from "@/lib/form";
import { requestPasswordReset } from "./actions";

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(
    requestPasswordReset,
    initialFormState,
  );

  if (state.success) return <FormAlert state={state} />;

  return (
    <form action={formAction} noValidate className="space-y-5">
      <FormAlert state={state} />
      <Field
        name="email"
        label="Adresse e-mail"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="Ex. nom@exemple.com"
        defaultValue={stringValue(state.values?.email)}
        error={state.errors?.email}
      />
      <SubmitButton pendingLabel="Envoi…" className="w-full">
        Recevoir un lien
      </SubmitButton>
    </form>
  );
}
