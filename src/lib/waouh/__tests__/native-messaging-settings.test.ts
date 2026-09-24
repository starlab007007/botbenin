import { describe, expect, it } from "vitest";

import {
  buildSmsUri,
  DEFAULT_NATIVE_MESSAGING_SETTINGS,
  formatBeninPhone,
  isValidBeninPhone,
  normalizeBeninPhone,
  validateNativeMessagingSettings,
} from "../nativeMessagingSettings";

describe("WAOUH Native Messaging settings", () => {
  it.each([
    ["+229 01 97 12 34 56", "+2290197123456"],
    ["00229 01 97 12 34 56", "+2290197123456"],
    ["2290197123456", "+2290197123456"],
    ["0197123456", "+2290197123456"],
  ])("normalise %s au format E.164 béninois", (input, expected) => {
    expect(normalizeBeninPhone(input)).toBe(expected);
    expect(isValidBeninPhone(input)).toBe(true);
  });

  it("refuse les anciens numéros à huit chiffres et les préfixes étrangers", () => {
    expect(isValidBeninPhone("97123456")).toBe(false);
    expect(isValidBeninPhone("+2280197123456")).toBe(false);
    expect(isValidBeninPhone("+229019712345")).toBe(false);
  });

  it("formate le numéro pour l’affichage", () => {
    expect(formatBeninPhone("+2290197123456")).toBe("+229 01 97 12 34 56");
  });

  it("construit un lien sms avec un message encodé", () => {
    expect(buildSmsUri("+229 01 97 12 34 56", "BONJOUR WAOUH"))
      .toBe("sms:+2290197123456?body=BONJOUR%20WAOUH");
    expect(buildSmsUri("+229 01 97 12 34 56", "BONJOUR WAOUH", "ios"))
      .toBe("sms:+2290197123456&body=BONJOUR%20WAOUH");
    expect(buildSmsUri("97123456")).toBe("");
  });

  it("exige un canal actif lorsque le service est activé", () => {
    const errors = validateNativeMessagingSettings({
      ...DEFAULT_NATIVE_MESSAGING_SETTINGS,
      business_phone_e164: "+2290197123456",
      enabled: true,
      sms_enabled: false,
      rcs_enabled: false,
    });
    expect(errors).toContain("Activez SMS ou RCS avant d’activer le service.");
  });

  it("interdit les groupes virtuels si le service est arrêté", () => {
    const errors = validateNativeMessagingSettings({
      ...DEFAULT_NATIVE_MESSAGING_SETTINGS,
      business_phone_e164: "+2290197123456",
      virtual_groups_enabled: true,
    });
    expect(errors).toContain("Activez le service avant les groupes virtuels.");
  });

  it("interdit d’activer le service sans adaptateur fournisseur", () => {
    const errors = validateNativeMessagingSettings({
      ...DEFAULT_NATIVE_MESSAGING_SETTINGS,
      business_phone_e164: "+2290197123456",
      enabled: true,
      provider: "not_configured",
    });
    expect(errors).toContain("Configurez un fournisseur avant d’activer le service.");
  });
});
