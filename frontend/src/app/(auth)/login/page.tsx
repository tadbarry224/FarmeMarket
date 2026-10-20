import type { Metadata } from "next";
import { FormPage } from "@/components/layout/form-page";
import { Alert } from "@/components/ui/alert";
import { safeNextPath } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Se connecter" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, expired, reset } = await searchParams;

  return (
    <FormPage title="Se connecter">
      {expired === "1" && (
        <Alert tone="info">
          Votre session a expiré. Reconnectez-vous pour continuer.
        </Alert>
      )}
      {reset === "1" && (
        <Alert tone="success">
          Votre mot de passe a été changé. Connectez-vous avec le nouveau.
        </Alert>
      )}
      <LoginForm next={safeNextPath(next)} />
    </FormPage>
  );
}
