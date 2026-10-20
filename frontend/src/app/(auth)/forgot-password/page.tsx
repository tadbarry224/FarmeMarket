import type { Metadata } from "next";
import { FormPage } from "@/components/layout/form-page";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = { title: "Mot de passe oublié" };

export default function ForgotPasswordPage() {
  return (
    <FormPage
      title="Mot de passe oublié"
      intro={
        <>
          <p>
            Indiquez l&apos;adresse e-mail de votre compte : vous recevrez un
            lien pour choisir un nouveau mot de passe.
          </p>
          <p className="mt-2 text-sm text-stone-600">
            Seule une adresse e-mail confirmée permet de récupérer un compte.
          </p>
        </>
      }
    >
      <ForgotPasswordForm />
    </FormPage>
  );
}
