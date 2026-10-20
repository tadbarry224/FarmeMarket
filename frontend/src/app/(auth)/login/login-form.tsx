"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FormAlert } from "@/components/forms/form-alert";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { initialFormState, stringValue } from "@/lib/form";
import { login } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [state, formAction] = useActionState(login, initialFormState);
  const errors = state.errors ?? {};

  return (
    <form action={formAction} noValidate className="space-y-5">
      <FormAlert state={state} />
      <input type="hidden" name="next" value={next} />

      <Field
        name="identifier"
        label="Téléphone ou adresse e-mail"
        autoComplete="username"
        placeholder="Ex. 622 12 34 56"
        hint="Le numéro peut être saisi avec ou sans +224."
        defaultValue={stringValue(state.values?.identifier)}
        error={errors.identifier}
      />

      <Field
        name="password"
        label="Mot de passe"
        type="password"
        autoComplete="current-password"
        error={errors.password}
      />

      <SubmitButton pendingLabel="Connexion…" className="w-full">
        Se connecter
      </SubmitButton>

      <div className="space-y-2 text-center text-base text-stone-700">
        <p>
          <Link
            href="/forgot-password"
            className="font-medium text-brand-700 underline"
          >
            Mot de passe oublié ?
          </Link>
        </p>
        <p>
          Pas encore de compte ?{" "}
          <Link
            href={`/register?next=${encodeURIComponent(next)}`}
            className="font-medium text-brand-700 underline"
          >
            Créer un compte
          </Link>
        </p>
      </div>
    </form>
  );
}
