import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h1 className="text-3xl font-bold text-stone-900 sm:text-4xl">
          Vendez et achetez vos produits agricoles, directement.
        </h1>
        <p className="max-w-2xl text-lg text-stone-700">
          FarmMarket met en relation les producteurs et les acheteurs de toute
          la Guinée : particuliers, restaurants, hôtels, commerçants et
          grossistes.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/register" className={buttonClasses("primary")}>
            Créer un compte gratuitement
          </Link>
          <Link href="/login" className={buttonClasses("secondary")}>
            J&apos;ai déjà un compte
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-stone-200 p-5">
          <h2 className="text-xl font-semibold text-stone-900">
            Vous êtes producteur
          </h2>
          <p className="mt-2 text-stone-700">
            Publiez vos produits, vos quantités et vos prix. Répondez aux
            demandes des acheteurs qui recherchent ce que vous cultivez.
          </p>
        </div>
        <div className="rounded-xl border border-stone-200 p-5">
          <h2 className="text-xl font-semibold text-stone-900">
            Vous êtes acheteur
          </h2>
          <p className="mt-2 text-stone-700">
            Trouvez des produits près de chez vous, ou publiez une demande :
            les producteurs vous font leurs propositions.
          </p>
        </div>
      </section>
    </div>
  );
}
