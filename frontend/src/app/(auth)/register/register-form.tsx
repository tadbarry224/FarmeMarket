"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FormAlert } from "@/components/forms/form-alert";
import { Field, FieldError, Label, RequiredLegend } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { initialFormState, stringValue } from "@/lib/form";
import { GUINEA_PREFIX } from "@/lib/phone";
import { register } from "./actions";

const ROLE_CHOICES = [
  {
    value: "PRODUCER",
    label: "Producteur",
    description: "Je vends ce que je cultive ou élève.",
  },
  {
    value: "BUYER",
    label: "Acheteur",
    description: "J'achète pour ma famille, mon commerce ou mon entreprise.",
  },
] as const;

export function RegisterForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState(register, initialFormState);
  const values = state.values ?? {};
  const errors = state.errors ?? {};
  const selectedRoles = Array.isArray(values.roles) ? values.roles : [];

  return (
    // noValidate : les messages d'erreur sont ceux de l'API, en français et précis
    <form action={formAction} noValidate className="space-y-5">
      <RequiredLegend />
      <FormAlert state={state} />
      {next && <input type="hidden" name="next" value={next} />}

      <Field
        name="fullName"
        label="Nom complet"
        required
        autoComplete="name"
        placeholder="Ex. Mamadou Diallo"
        defaultValue={stringValue(values.fullName)}
        error={errors.fullName}
      />

      <Field
        name="phone"
        label="Numéro de téléphone"
        required
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        prefix={GUINEA_PREFIX}
        placeholder="622 12 34 56"
        hint="Il vous servira à vous connecter."
        defaultValue={stringValue(values.phone)}
        error={errors.phone}
      />

      <Field
        name="email"
        label="Adresse e-mail (facultatif)"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="Ex. nom@exemple.com"
        hint="Utile pour récupérer votre mot de passe si vous l'oubliez."
        defaultValue={stringValue(values.email)}
        error={errors.email}
      />

      <Field
        name="password"
        label="Mot de passe"
        required
        type="password"
        autoComplete="new-password"
        hint="8 caractères minimum."
        error={errors.password}
      />

      <fieldset aria-describedby="roles-hint">
        <legend>
          <Label required>Vous êtes</Label>
        </legend>
        <p id="roles-hint" className="mt-1 text-sm text-stone-600">
          Vous pouvez cocher les deux.
        </p>
        <div className="mt-2 space-y-2">
          {ROLE_CHOICES.map((role) => (
            <label
              key={role.value}
              className="flex min-h-12 cursor-pointer items-start gap-3 rounded-lg border border-stone-300 p-3 has-checked:border-brand-600 has-checked:bg-brand-50"
            >
              <input
                type="checkbox"
                name="roles"
                value={role.value}
                defaultChecked={selectedRoles.includes(role.value)}
                className="mt-1 size-5 accent-brand-600"
              />
              <span>
                <span className="block font-medium text-stone-900">
                  {role.label}
                </span>
                <span className="block text-sm text-stone-600">
                  {role.description}
                </span>
              </span>
            </label>
          ))}
        </div>
        <FieldError message={errors.roles} />
      </fieldset>

      <SubmitButton pendingLabel="Création du compte…" className="w-full">
        Créer mon compte
      </SubmitButton>

      <p className="text-center text-base text-stone-700">
        Déjà inscrit ?{" "}
        <Link href="/login" className="font-medium text-brand-700 underline">
          Se connecter
        </Link>
      </p>
    </form>
  );
}

