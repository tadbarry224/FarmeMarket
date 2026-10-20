import { formatPhone, toApiPhone } from "./phone";

describe("toApiPhone", () => {
  it("ajoute le préfixe +224 à un numéro local", () => {
    expect(toApiPhone(" 622 12 34 56 ")).toBe("+224 622 12 34 56");
  });

  it("transmet tel quel un numéro saisi avec son indicatif", () => {
    expect(toApiPhone("+224622123456")).toBe("+224622123456");
    expect(toApiPhone("00224 622 12 34 56")).toBe("00224 622 12 34 56");
  });

  it("laisse un champ vide vide, pour que l'API signale le champ obligatoire", () => {
    expect(toApiPhone("  ")).toBe("");
  });
});

describe("formatPhone", () => {
  it("affiche un numéro enregistré par groupes de chiffres", () => {
    expect(formatPhone("+224622123456")).toBe("+224 622 12 34 56");
  });

  it("laisse intact un format inattendu", () => {
    expect(formatPhone("+33612345678")).toBe("+33612345678");
  });
});
