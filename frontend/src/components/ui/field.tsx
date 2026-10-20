import type { InputHTMLAttributes, ReactNode } from "react";

export const inputClasses =
  "block min-h-12 w-full rounded-lg border border-stone-300 bg-white px-3 text-base text-stone-900 placeholder:text-stone-400 focus:border-brand-600 focus:outline-2 focus:outline-brand-600 aria-invalid:border-red-600";

interface FieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "prefix"> {
  name: string;
  label: string;
  // Aide affichée sous le champ dès le départ (contraintes, exemple…)
  hint?: string;
  // Message d'erreur renvoyé par l'API pour ce champ
  error?: string;
  // Texte affiché avant la saisie, ex. le préfixe +224
  prefix?: string;
}

// Champ de formulaire avec son libellé, son aide et son message d'erreur.
// Un champ obligatoire est signalé par « * » (légende : <RequiredLegend />).
export function Field({
  name,
  label,
  hint,
  error,
  prefix,
  required,
  className = "",
  ...inputProps
}: FieldProps) {
  const id = `field-${name}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={className}>
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      <div className="mt-1 flex">
        {prefix && (
          <span className="inline-flex min-h-12 items-center rounded-l-lg border border-r-0 border-stone-300 bg-stone-100 px-3 text-base text-stone-700">
            {prefix}
          </span>
        )}
        <input
          id={id}
          name={name}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
          className={`${inputClasses} ${prefix ? "rounded-l-none" : ""}`}
          {...inputProps}
        />
      </div>
      {hint && (
        <p id={hintId} className="mt-1 text-sm text-stone-600">
          {hint}
        </p>
      )}
      <FieldError id={errorId} message={error} />
    </div>
  );
}

export function Label({
  htmlFor,
  required,
  children,
}: {
  htmlFor?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="block text-base font-medium text-stone-900">
      {children}
      {required && (
        <span className="text-red-700" aria-hidden="true">
          {" "}
          *
        </span>
      )}
    </label>
  );
}

export function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 text-sm font-medium text-red-700">
      {message}
    </p>
  );
}

export function RequiredLegend() {
  return (
    <p className="text-sm text-stone-600">
      Les champs marqués d&apos;un <span className="text-red-700">*</span> sont
      obligatoires.
    </p>
  );
}
