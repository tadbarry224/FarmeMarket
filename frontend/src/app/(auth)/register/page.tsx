import type { Metadata } from "next";
import { FormPage } from "@/components/layout/form-page";
import { safeNextPath } from "@/lib/auth";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Créer un compte" };

export default async function RegisterPage({
  searchParams,
}: PageProps<"/register">) {
  const { next } = await searchParams;

  return (
    <FormPage
      title="Créer un compte"
      intro="L'inscription est gratuite et ne prend qu'une minute."
    >
      <RegisterForm
        next={typeof next === "string" ? safeNextPath(next) : undefined}
      />
    </FormPage>
  );
}
