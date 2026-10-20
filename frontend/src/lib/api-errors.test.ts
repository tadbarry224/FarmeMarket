import {
  toApiError,
  UNREACHABLE_MESSAGE,
  unreachableError,
} from "./api-errors";

describe("toApiError", () => {
  it("reprend le message et les erreurs par champ de l'API", () => {
    expect(
      toApiError(400, {
        statusCode: 400,
        message: "Certains champs sont invalides.",
        errors: { phone: "Numéro invalide.", ignored: 42 },
      }),
    ).toEqual({
      status: 400,
      message: "Certains champs sont invalides.",
      errors: { phone: "Numéro invalide." },
    });
  });

  it("assemble un message renvoyé sous forme de liste", () => {
    expect(toApiError(400, { message: ["Premier.", "Second."] }).message).toBe(
      "Premier. Second.",
    );
  });

  it("remplace les erreurs serveur par un message compréhensible", () => {
    expect(toApiError(500, { message: "Internal server error" })).toEqual({
      status: 500,
      message:
        "Une erreur est survenue sur le serveur. Réessayez dans un instant.",
      errors: {},
    });
  });

  it("tolère une réponse sans corps exploitable", () => {
    expect(toApiError(404, undefined)).toEqual({
      status: 404,
      message: "La demande n'a pas pu aboutir.",
      errors: {},
    });
  });
});

it("signale un serveur injoignable avec le code 0", () => {
  expect(unreachableError()).toEqual({
    status: 0,
    message: UNREACHABLE_MESSAGE,
    errors: {},
  });
});
