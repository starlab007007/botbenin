import { describe, expect, it, vi } from "vitest";
import { toUserFacingError, userFacingErrorText } from "../../userFacingError";

describe("WAOUH user-facing errors", () => {
  it("masque les erreurs serveur brutes", () => {
    const message = userFacingErrorText(
      new Error("PostgrestError PGRST301 internal server error"),
      "load",
    );
    expect(message).not.toContain("Postgrest");
    expect(message).not.toContain("PGRST");
    expect(message).toContain("Réessayez");
  });

  it("traduit une session expirée", () => {
    const result = toUserFacingError({ status: 401, message: "JWT expired" });
    expect(result.title).toBe("Session expirée");
    expect(result.description).toContain("Reconnectez");
  });

  it("traduit un timeout sans exposer le transport", () => {
    const result = toUserFacingError(new Error("Signal timed out."), "send");
    expect(result.title).toBe("Le service met trop de temps à répondre");
    expect(result.description).not.toContain("Signal");
  });

  it("fournit un message stable par contexte", () => {
    expect(userFacingErrorText(new Error("opaque failure"), "save"))
      .toBe("Vos modifications n'ont pas été enregistrées. Réessayez.");
  });
});
