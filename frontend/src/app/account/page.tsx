import type { Metadata } from "next";
import { Alert } from "@/components/ui/alert";
import { requireUser } from "@/lib/auth";
import { formatPhone } from "@/lib/phone";
import { ROLE_LABELS } from "@/lib/types";
import { ChangePasswordForm, ResendVerificationForm } from "./account-forms";

export const metadata: Metadata = { title: "Mon compte" };

export default async function AccountPage({
  searchParams,
}: PageProps<"/account">) {
  const user = await requireUser("/account");
  const { welcome } = await searchParams;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold text-stone-900">Mon compte</h1>

      {welcome === "1" && (
        <Alert tone="success">
          Bienvenue sur FarmMarket, {user.fullName} ! Votre compte est créé.
          {user.email &&
            " Un lien de confirmation a été envoyé à votre adresse e-mail."}
        </Alert>
      )}

      <section className="space-y-4 rounded-xl border border-stone-200 p-5">
        <h2 className="text-xl font-semibold text-stone-900">Mon profil</h2>
        <dl className="grid gap-4 sm:grid-cols-2">
          <ProfileItem label="Nom complet" value={user.fullName} />
          <ProfileItem label="Téléphone" value={formatPhone(user.phone)} />
          <ProfileItem
            label="Adresse e-mail"
            value={user.email ?? "Aucune"}
            detail={
              user.email
                ? user.emailVerifiedAt
                  ? "Confirmée"
                  : "Non confirmée"
                : undefined
            }
          />
          <ProfileItem
            label="Rôles"
            value={user.roles.map((role) => ROLE_LABELS[role]).join(", ")}
          />
        </dl>

        {user.email && !user.emailVerifiedAt && (
          <div className="space-y-3 border-t border-stone-200 pt-4">
            <p className="text-stone-700">
              Confirmez votre adresse e-mail pour pouvoir récupérer votre mot
              de passe en cas d&apos;oubli.
            </p>
            <ResendVerificationForm />
          </div>
        )}
      </section>

      <section className="space-y-4 rounded-xl border border-stone-200 p-5">
        <h2 className="text-xl font-semibold text-stone-900">
          Changer mon mot de passe
        </h2>
        <ChangePasswordForm />
      </section>
    </div>
  );
}

function ProfileItem({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div>
      <dt className="text-sm text-stone-600">{label}</dt>
      <dd className="text-base font-medium text-stone-900">
        {value}
        {detail && (
          <span className="ml-2 text-sm font-normal text-stone-600">
            ({detail})
          </span>
        )}
      </dd>
    </div>
  );
}
