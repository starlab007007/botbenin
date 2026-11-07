import { describe, expect, it } from "vitest";
import { beninPhone, extractContacts, pageNeedsRenderer } from "../../../../supabase/functions/_shared/waouh-contact-extract";

describe("extraction des contacts d'annonce", () => {
  it("lit un lien WhatsApp et un numéro préfixé", () => {
    const r = extractContacts("iPhone 12 à vendre. WhatsApp: https://wa.me/22997123456 ou appelez +229 96 11 22 33");
    expect(r.whatsapp).toEqual(["+2290197123456"]);
    expect(r.phones).toEqual(["+2290196112233"]);
  });
  it("ne prend jamais un prix pour un numéro", () => {
    expect(extractContacts("Prix 250 000 F CFA, état neuf").phones).toEqual([]);
    expect(extractContacts("Vendu 12500000 FCFA").phones).toEqual([]);
    expect(extractContacts("Terrain de 60000000 m2").phones).toEqual([]);
    expect(extractContacts("Prix: 1.250.000").phones).toEqual([]);
  });
  it("accepte un numéro groupé ou précédé d'un mot de contact", () => {
    expect(extractContacts("Contact 97 12 34 56").phones).toEqual(["+2290197123456"]);
    expect(extractContacts("Appelez 01 96 12 34 56").phones).toEqual(["+2290196123456"]);
    expect(extractContacts("tél 66123456").phones).toEqual(["+2290166123456"]);
  });
  it("rejette les préfixes inexistants et les suites triviales", () => {
    expect(beninPhone("0188123456")).toBeNull();
    expect(beninPhone("99999999")).toBeNull();
    expect(beninPhone("+22997123456")).toBe("+2290197123456");
    expect(beninPhone("0022997123456")).toBe("+2290197123456");
  });
  it("marque WhatsApp quand le mot est proche", () => {
    const r = extractContacts("Écrivez-moi sur WhatsApp 97 12 34 56");
    expect(r.whatsapp).toEqual(["+2290197123456"]);
    expect(r.phones).toEqual([]);
  });
  it("lit les e-mails utiles seulement", () => {
    const r = extractContacts("vente@boutique.bj image@x.png noreply@site.com");
    expect(r.emails).toEqual(["vente@boutique.bj"]);
  });
  it("signale les pages à rendu dynamique", () => {
    expect(pageNeedsRenderer("https://www.facebook.com/marketplace/item/1")).toBe(true);
    expect(pageNeedsRenderer("https://jiji.bj/annonce")).toBe(false);
  });
});
