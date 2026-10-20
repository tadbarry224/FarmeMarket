import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { register } from "./actions";
import { RegisterForm } from "./register-form";

// La Server Action est remplacée : le test vérifie le formulaire, pas l'appel à l'API
jest.mock("./actions", () => ({ register: jest.fn() }));
const registerMock = jest.mocked(register);

describe("RegisterForm", () => {
  beforeEach(() => registerMock.mockReset());

  it("présente les champs avec le préfixe +224 et les contraintes", () => {
    render(<RegisterForm />);

    expect(screen.getByLabelText(/Nom complet/)).toHaveAttribute(
      "aria-required",
      "true",
    );
    expect(screen.getByLabelText(/Numéro de téléphone/)).toHaveAttribute(
      "type",
      "tel",
    );
    expect(screen.getByText("+224")).toBeInTheDocument();
    expect(screen.getByLabelText(/Mot de passe/)).toHaveAccessibleDescription(
      "8 caractères minimum.",
    );
    expect(
      screen.getByLabelText("Adresse e-mail (facultatif)"),
    ).not.toHaveAttribute("aria-required");
    expect(
      screen.getByRole("checkbox", { name: /Producteur/ }),
    ).not.toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: /Acheteur/ }),
    ).not.toBeChecked();
  });

  it("affiche les erreurs de l'API sous chaque champ et garde la saisie", async () => {
    registerMock.mockResolvedValue({
      message: "Certains champs sont invalides.",
      errors: {
        phone: "Numéro de téléphone guinéen invalide (ex. 622 12 34 56).",
        roles: "Choisissez au moins un rôle : producteur ou acheteur.",
      },
      values: {
        fullName: "Aïssatou Bah",
        phone: "12345",
        email: "",
        roles: [],
      },
    });
    const user = userEvent.setup();
    render(<RegisterForm />);

    await user.type(screen.getByLabelText(/Nom complet/), "Aïssatou Bah");
    await user.type(screen.getByLabelText(/Numéro de téléphone/), "12345");
    await user.click(screen.getByRole("button", { name: "Créer mon compte" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Certains champs sont invalides.",
    );
    expect(
      screen.getByLabelText(/Numéro de téléphone/),
    ).toHaveAccessibleDescription(
      "Il vous servira à vous connecter. Numéro de téléphone guinéen invalide (ex. 622 12 34 56).",
    );
    expect(
      screen.getByText("Choisissez au moins un rôle : producteur ou acheteur."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Nom complet/)).toHaveValue("Aïssatou Bah");

    // La Server Action reçoit les valeurs saisies
    const formData = registerMock.mock.calls[0][1];
    expect(formData.get("fullName")).toBe("Aïssatou Bah");
    expect(formData.get("phone")).toBe("12345");
  });
});
