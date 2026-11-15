import { describe, expect, it, vi } from "vitest";
import { buildGuidedAsk, guidedAskFromSearchParams, guidedAskText, guidedKindFrom, openGuidedChat, peekGuidedAsk, queueGuidedAsk, takeGuidedAsk } from "../guidedAsk";
import { isChatSearchGoal } from "@/lib/waouh/chatSearchGoal";

const memory = () => {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), removeItem: (k: string) => void data.delete(k) };
};

describe("recherche guidée → moteur du Chat", () => {
  it("écrit une phrase que le Chat reconnaît comme une recherche, pour chaque entrée", () => {
    for (const kind of ["acheter", "trouver", "demander", "opportunite", "service", "prestation"] as const) {
      const text = guidedAskText({ kind, q: "climatiseur 1,5 CV", city: "Cotonou", budget: "250000" });
      expect(isChatSearchGoal(text), kind).toBe(true);
      expect(text).toContain("climatiseur 1,5 CV");
      expect(text).toContain("à Cotonou");
    }
  });

  it("ajoute le budget en clair, sauf pour une opportunité", () => {
    expect(guidedAskText({ kind: "acheter", q: "iPhone 13", budget: 300000 })).toBe("Je cherche à acheter iPhone 13, budget maximum 300 000 FCFA");
    expect(guidedAskText({ kind: "opportunite", q: "appel d’offres BTP", budget: 300000 })).toBe("Je cherche une opportunité : appel d’offres BTP");
  });

  it("ne double ni la formule ni la ville déjà écrites par l’utilisateur", () => {
    expect(guidedAskText({ kind: "trouver", q: "Je cherche un plombier à Porto-Novo", city: "Porto-Novo" })).toBe("Je cherche un plombier à Porto-Novo");
  });

  it("garde le texte libre de l’accueil tel quel et ne force pas la fenêtre de recherche", () => {
    const ask = buildGuidedAsk({ kind: "trouver", q: "Bonjour Bot", free: true });
    expect(ask).toMatchObject({ text: "Bonjour Bot", force: false });
    expect(buildGuidedAsk({ kind: "acheter", q: "moto" })?.force).toBe(true);
  });

  it("vendre ouvre la fiche de vente du Chat : aucune phrase n’est envoyée", () => {
    expect(buildGuidedAsk({ kind: "vendre" })).toMatchObject({ kind: "vendre", text: "", force: false });
    expect(buildGuidedAsk({ kind: "acheter", q: "  " })).toBeNull();
  });

  it("n’envoie une demande qu’une fois et ignore une demande trop ancienne", () => {
    const store = memory();
    queueGuidedAsk({ kind: "service", q: "traiteur pour 50 personnes" }, store);
    expect(peekGuidedAsk(store)?.kind).toBe("service");
    expect(takeGuidedAsk(store)?.text).toBe("Je cherche un service : traiteur pour 50 personnes");
    expect(takeGuidedAsk(store)).toBeNull();
    queueGuidedAsk({ kind: "acheter", q: "moto" }, store);
    expect(takeGuidedAsk(store, Date.now() + 3 * 60_000)).toBeNull();
  });

  it("convertit tout ancien lien de recherche guidée en demande pour le Chat", () => {
    const p = (s: string) => new URLSearchParams(s);
    expect(guidedAskFromSearchParams(p("q=Samsung+S25&go=1&mode=find_sellers&city=Cotonou&budget=400000"))).toEqual({ kind: "acheter", q: "Samsung S25", city: "Cotonou", budget: "400000" });
    expect(guidedAskFromSearchParams(p("q=plombier&go=1&kind=service"))?.kind).toBe("service");
    expect(guidedAskFromSearchParams(p("q=site+web&go=1&kind=project"))?.kind).toBe("prestation");
    expect(guidedAskFromSearchParams(p("q=soja&kind=trouver"))?.kind).toBe("trouver");
    expect(guidedAskFromSearchParams(p("q=soja&go=1&tab=lab"))?.kind).toBe("trouver");
    // Vendre (y compris la vente d'un article publié) ouvre la fiche de vente du Chat.
    expect(guidedAskFromSearchParams(p("q=soja&go=1&kind=vendre&mode=find_buyers&article_id=a"))).toEqual({ kind: "vendre" });
    // Rien à lancer : le Chat s'ouvre simplement.
    expect(guidedAskFromSearchParams(p("tab=lab"))).toBeNull();
  });

  it("guidedKindFrom reconnaît les noms de parcours", () => {
    expect(guidedKindFrom("acheter")).toBe("acheter");
    expect(guidedKindFrom("demander")).toBe("demander");
    expect(guidedKindFrom(null, "find_sellers")).toBe("acheter");
    expect(guidedKindFrom("inconnu")).toBe("trouver");
  });

  it("openGuidedChat ouvre le Chat, avec connexion d'abord pour un visiteur", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("sessionStorage", { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) });
    const calls: string[] = [];
    openGuidedChat((path) => void calls.push(path), { kind: "acheter", q: "riz" }, true);
    openGuidedChat((path) => void calls.push(path), { kind: "acheter", q: "riz" }, false);
    openGuidedChat((path) => void calls.push(path), null, false);
    expect(calls[0]).toMatch(/^\/app\/chat/);
    expect(calls[1]).toMatch(/^\/app\/auth\?next=/);
    expect(calls[2]).toMatch(/^\/app\/chat/);
    vi.unstubAllGlobals();
  });
});

describe("champ libre : besoin court ou conversation", () => {
  it("traite un besoin sans verbe comme une recherche", () => {
    const ask = buildGuidedAsk({ kind: "trouver", q: "Riz parfume", free: true });
    expect(ask?.text).toBe("Je cherche Riz parfume");
    expect(ask?.force).toBe(true);
    expect(ask?.goal).toBe("Riz parfume");
  });
  it("laisse une question ou une salutation telle quelle", () => {
    for (const q of ["Bonjour Bot", "Comment vendre plus vite ?", "Où en sont mes missions"]) {
      const ask = buildGuidedAsk({ kind: "trouver", q, free: true });
      expect(ask?.text).toBe(q);
      expect(ask?.force).toBe(false);
    }
  });
  it("ne reformule pas une demande déjà formulée", () => {
    expect(buildGuidedAsk({ kind: "trouver", q: "Je cherche un frigo à Calavi", free: true })?.text).toBe("Je cherche un frigo à Calavi");
  });
});
