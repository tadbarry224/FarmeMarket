import type { ReactNode } from "react";

// Mise en page des pages de formulaire simples (connexion, inscription…) : colonne étroite
export function FormPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-stone-900">{title}</h1>
        {intro && <div className="text-base text-stone-700">{intro}</div>}
      </div>
      {children}
    </div>
  );
}
