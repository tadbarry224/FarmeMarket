"use client";

import { useFormStatus } from "react-dom";
import { Button } from "./button";

// Bouton d'envoi désactivé pendant l'envoi : évite les doubles envois sur une connexion lente
export function SubmitButton({
  children,
  pendingLabel = "Envoi en cours…",
  variant,
  className,
}: {
  children: string;
  pendingLabel?: string;
  variant?: "primary" | "secondary";
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} variant={variant} className={className}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
