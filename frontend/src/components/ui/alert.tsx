import type { ReactNode } from "react";

type AlertTone = "error" | "success" | "info";

const TONES: Record<AlertTone, string> = {
  error: "border-red-200 bg-red-50 text-red-800",
  success: "border-brand-100 bg-brand-50 text-brand-800",
  info: "border-stone-200 bg-stone-50 text-stone-800",
};

// Message général (erreur d'un formulaire, confirmation…), annoncé par les lecteurs d'écran
export function Alert({
  tone,
  children,
}: {
  tone: AlertTone;
  children: ReactNode;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-lg border px-4 py-3 text-base ${TONES[tone]}`}
    >
      {children}
    </div>
  );
}
