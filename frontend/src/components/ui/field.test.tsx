import { render, screen } from "@testing-library/react";
import { Field, RequiredLegend } from "./field";

describe("Field", () => {
  it("relie le libellé, l'aide et l'erreur au champ", () => {
    render(
      <Field
        name="phone"
        label="Numéro de téléphone"
        required
        hint="Il vous servira à vous connecter."
        error="Numéro de téléphone guinéen invalide."
      />,
    );

    const input = screen.getByLabelText(/Numéro de téléphone/);
    expect(input).toHaveAttribute("name", "phone");
    expect(input).toHaveAttribute("aria-required", "true");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription(
      "Il vous servira à vous connecter. Numéro de téléphone guinéen invalide.",
    );
  });

  it("marque un champ obligatoire d'une étoile, expliquée par la légende", () => {
    render(
      <>
        <RequiredLegend />
        <Field name="fullName" label="Nom complet" required />
        <Field name="email" label="Adresse e-mail (facultatif)" />
      </>,
    );

    expect(screen.getByText("Nom complet")).toHaveTextContent("Nom complet *");
    expect(
      screen.getByLabelText("Adresse e-mail (facultatif)"),
    ).not.toHaveAttribute("aria-required");
    expect(screen.getByText(/sont obligatoires/)).toHaveTextContent(
      "Les champs marqués d'un * sont obligatoires.",
    );
  });

  it("affiche le préfixe avant la saisie", () => {
    render(<Field name="phone" label="Téléphone" prefix="+224" />);

    expect(screen.getByText("+224")).toBeInTheDocument();
    expect(screen.getByLabelText("Téléphone")).not.toHaveAttribute(
      "aria-invalid",
    );
  });
});
