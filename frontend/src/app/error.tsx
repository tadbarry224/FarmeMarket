"use client";

import { Button } from "@/components/ui/button";

// Affichée quand une page ne peut pas se charger (API injoignable, erreur inattendue)
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-stone-900">
        Cette page n&apos;a pas pu se charger
      </h1>
      <p className="text-stone-700">
        Le serveur FarmMarket est peut-être momentanément injoignable. Vérifiez
        votre connexion puis réessayez.
      </p>
      <Button onClick={reset}>Réessayer</Button>
    </div>
  );
}
