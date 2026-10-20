import type { Metadata } from "next";
import { FormPage } from "@/components/layout/form-page";
import { Alert } from "@/components/ui/alert";
import { VerifyEmailForm } from "./verify-email-form";

export const metadata: Metadata = { title: "Confirmer mon adresse e-mail" };

// Page ouverte depuis le lien reçu par e-mail. La confirmation demande un clic :
// certaines messageries ouvrent automatiquement les liens pour les analyser,
// ce qui suffirait sinon à consommer le lien à la place de l'utilisateur.
export default async function VerifyEmailPage({
  searchParams,
}: PageProps<"/verify-email">) {
  const { token } = await searchParams;

  return (
    <FormPage title="Confirmer mon adresse e-mail">
      {typeof token === "string" && token !== "" ? (
        <VerifyEmailForm token={token} />
      ) : (
        <Alert tone="error">
          Ce lien est incomplet. Ouvrez à nouveau le lien reçu par e-mail, ou
          demandez-en un nouveau depuis votre compte.
        </Alert>
      )}
    </FormPage>
  );
}
