import { safeNextPath } from "./auth";

describe("safeNextPath", () => {
  it("accepte un chemin interne au site", () => {
    expect(safeNextPath("/account")).toBe("/account");
    expect(safeNextPath("/products?q=riz")).toBe("/products?q=riz");
  });

  it("refuse une redirection vers un autre site", () => {
    expect(safeNextPath("https://site-pirate.example")).toBe("/account");
    expect(safeNextPath("//site-pirate.example")).toBe("/account");
  });

  it("utilise la destination par défaut sans valeur exploitable", () => {
    expect(safeNextPath(undefined)).toBe("/account");
    expect(safeNextPath(["/a", "/b"], "/")).toBe("/");
  });
});
