import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-stone-900">Page introuvable</h1>
      <p className="text-stone-700">
        Cette page n&apos;existe pas ou n&apos;est plus disponible.
      </p>
      <Link href="/" className={buttonClasses("secondary")}>
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}
