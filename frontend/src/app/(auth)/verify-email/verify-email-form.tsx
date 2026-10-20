"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FormAlert } from "@/components/forms/form-alert";
import { buttonClasses } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { initialFormState } from "@/lib/form";
import { verifyEmail } from "./actions";

export function VerifyEmailForm({ token }: { token: string }) {
  const [state, formAction] = useActionState(verifyEmail, initialFormState);

  if (state.success) {
    return (
      <div className="space-y-4">
        <FormAlert state={state} />
        <Link href="/account" className={buttonClasses("secondary")}>
          Aller à mon compte
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <FormAlert state={state} />
      <input type="hidden" name="token" value={token} />
      <SubmitButton pendingLabel="Confirmation…" className="w-full">
        Confirmer mon adresse e-mail
      </SubmitButton>
    </form>
  );
}
