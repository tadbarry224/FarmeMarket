import type { Metadata } from "next";
import Link from "next/link";
import { FormPage } from "@/components/layout/form-page";
import { Alert } from "@/components/ui/alert";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "Nouveau mot de passe" };

// Page ouverte depuis le lien reçu par e-mail (« mot de passe oublié »)
export default async function ResetPasswordPage({
  searchParams,
}: PageProps<"/reset-password">) {
  const { token } = await searchParams;

  return (
    <FormPage title="Choisir un nouveau mot de passe">
      {typeof token === "string" && token !== "" ? (
        <ResetPasswordForm token={token} />
      ) : (
        <Alert tone="error">
          Ce lien est incomplet.{" "}
          <Link href="/forgot-password" className="font-medium underline">
            Demandez un nouveau lien
          </Link>
          .
        </Alert>
      )}
    </FormPage>
  );
}
