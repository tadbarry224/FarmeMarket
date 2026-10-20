import { Alert } from "@/components/ui/alert";
import type { FormState } from "@/lib/form";

// Message général d'un formulaire après envoi : erreur ou confirmation
export function FormAlert({ state }: { state: FormState }) {
  if (!state.message) return null;
  return (
    <Alert tone={state.success ? "success" : "error"}>{state.message}</Alert>
  );
}
