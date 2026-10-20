import Link from "next/link";
import { logout } from "@/app/actions/session";
import { getCurrentUser } from "@/lib/auth";
import type { User } from "@/lib/types";

export async function SiteHeader() {
  // Si l'API est momentanément injoignable, l'en-tête s'affiche comme pour un visiteur :
  // la page elle-même signalera l'erreur.
  let user: User | null = null;
  try {
    user = await getCurrentUser();
  } catch {
    user = null;
  }

  return (
    <HeaderShell>
      {user ? (
        <>
          <Link
            href="/account"
            className="truncate rounded-lg px-3 py-2 text-base font-medium text-stone-800 hover:bg-stone-100"
          >
            <span className="sr-only">Mon compte : </span>
            {user.fullName}
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-lg px-3 py-2 text-base font-medium text-stone-700 hover:bg-stone-100"
            >
              Se déconnecter
            </button>
          </form>
        </>
      ) : (
        <>
          <Link
            href="/login"
            className="rounded-lg px-3 py-2 text-base font-medium text-stone-800 hover:bg-stone-100"
          >
            Se connecter
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-brand-600 px-3 py-2 text-base font-semibold text-white hover:bg-brand-700"
          >
            Créer un compte
          </Link>
        </>
      )}
    </HeaderShell>
  );
}

// Affiché pendant le chargement de l'utilisateur, pour que la page apparaisse sans attendre
export function SiteHeaderFallback() {
  return <HeaderShell />;
}

function HeaderShell({ children }: { children?: React.ReactNode }) {
  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex min-h-16 max-w-5xl items-center justify-between gap-2 px-4">
        <Link href="/" className="text-xl font-bold text-brand-700">
          FarmMarket
        </Link>
        <nav aria-label="Compte" className="flex min-w-0 items-center gap-1">
          {children}
        </nav>
      </div>
    </header>
  );
}
