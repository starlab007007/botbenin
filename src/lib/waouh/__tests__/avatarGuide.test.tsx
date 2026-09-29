// L'avatar guide (Web) : lecture défensive, libellés, ouverture unique, rendu de la carte et des réglages.
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const invoke = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: (...a: unknown[]) => invoke(...a) } } }));

import {
  CADENCE_OPTIONS, fetchAvatarPrefs, nextPointLabel, openAvatarBriefing, parseAvatarBriefing, parseAvatarPrefs, saveAvatarPrefs, shouldAutoOpenNow,
} from "../avatarGuide";
import { WaouhAvatarBriefingCard } from "@/components/waouh/WaouhAvatarBriefingCard";
import { WaouhAvatarGuideBar } from "@/components/waouh/WaouhAvatarGuideBar";

const briefing = {
  kind: "welcome",
  greeting: "Bonjour Zime, content de vous retrouver.",
  sentences: [
    "Bonjour Zime, content de vous retrouver.",
    "1 offre à traiter, 1 offre sans réponse depuis plus de 24 h.",
    "Prochaine étape : relancer le vendeur de « iPhone 13 », d'un tap.",
  ],
  sections: [
    { key: "activities", title: "Ce que je fais", items: [{ label: "iPhone 13", detail: "Offre transmise · il y a 26 h", tone: "warn" }] },
    { key: "watch", title: "Mes veilles", items: [{ label: "Pixel 7", detail: "Contact recherché", tone: "info" }] },
    { key: "next", title: "Prochaines étapes", items: [{ label: "Relancer", detail: "iPhone 13", tone: "warn" }] },
  ],
  actions: [
    { id: "relancer:n1", label: "Relancer le vendeur", thread_id: "t1", article_id: "a1", role: "buyer", title: "iPhone 13" },
    { id: "avatar:reglages", label: "Régler mes points" },
  ],
  tip: "Je peux garder une offre en veille et vous prévenir dès qu'un vendeur devient joignable.",
  generatedAt: "2026-09-29T09:30:00Z",
};

beforeEach(() => invoke.mockReset());

describe("avatar guide — lecture défensive", () => {
  it("point invalide → null ; trop court → null ; sections et actions filtrées", () => {
    expect(parseAvatarBriefing(null)).toBeNull();
    expect(parseAvatarBriefing({ sentences: ["seule"] })).toBeNull();
    const parsed = parseAvatarBriefing({ ...briefing, sections: [{ key: "x", title: "", items: [] }, ...briefing.sections], actions: [{ label: "sans id" }, ...briefing.actions] })!;
    expect(parsed.sections).toHaveLength(3);
    expect(parsed.actions).toHaveLength(2);
    expect(parsed.actions[0].role).toBe("buyer");
    expect(parseAvatarBriefing({ ...briefing, sentences: ["a", "b", "c", "d", "e"] })!.sentences).toHaveLength(3);
    expect(parseAvatarBriefing({ ...briefing, kind: "??" })!.kind).toBe("point");
  });

  it("réglages : valeurs inconnues → défauts", () => {
    expect(parseAvatarPrefs(null)).toBeNull();
    expect(parseAvatarPrefs({ cadence: "chaque-minute", welcome: "oui", quiet_start: 99 })).toMatchObject({ cadence: "daily", welcome: true, quiet_start: 21, quiet_end: 7 });
    expect(parseAvatarPrefs({ cadence: "weekly", welcome: false, quiet_start: 22, quiet_end: 6 })).toMatchObject({ cadence: "weekly", welcome: false, quiet_start: 22, quiet_end: 6 });
    expect(CADENCE_OPTIONS.map((o) => o.value)).toEqual(["off", "hourly", "every_4h", "daily", "weekly"]);
  });

  it("libellé du prochain point", () => {
    const now = new Date("2026-09-29T08:00:00Z");
    expect(nextPointLabel(null, "off", now)).toBe("Points réguliers désactivés");
    expect(nextPointLabel(null, "daily", now)).toBe("Prochain point bientôt");
    expect(nextPointLabel("2026-09-29T11:00:00Z", "daily", now)).toBe("Prochain point dans 3 h");
    expect(nextPointLabel("2026-09-30T08:00:00Z", "daily", now)).toBe("Prochain point demain");
    expect(nextPointLabel("2026-10-03T08:00:00Z", "weekly", now)).toBe("Prochain point dans 4 jours");
    expect(nextPointLabel("2026-09-29T07:00:00Z", "daily", now)).toBe("Prochain point imminent");
  });

  it("ouverture automatique : une seule par fenêtre de 30 min, même avec plusieurs instances", () => {
    const data = new Map<string, string>();
    const storage = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
    const t0 = 1_800_000_000_000;
    expect(shouldAutoOpenNow(t0, storage)).toBe(true);
    expect(shouldAutoOpenNow(t0 + 10 * 60_000, storage)).toBe(false);
    expect(shouldAutoOpenNow(t0 + 31 * 60_000, storage)).toBe(true);
    const broken = { getItem: () => { throw new Error("bloqué"); }, setItem: () => { throw new Error("bloqué"); } };
    expect(shouldAutoOpenNow(t0, broken)).toBe(true);
  });
});

describe("avatar guide — appels serveur", () => {
  it("open : renvoie le message et le point ; erreur réseau → null sans exception", async () => {
    invoke.mockResolvedValue({ data: { ok: true, sent: true, reason: "open", briefing, message: { id: "m1", direction: "out", text: "x", meta: {}, created_at: "2026-09-29T09:30:00Z" }, prefs: { cadence: "daily", welcome: true, quiet_start: 21, quiet_end: 7 } }, error: null });
    const r = await openAvatarBriefing("open", "sess-123456");
    expect(r?.sent).toBe(true);
    expect(r?.briefing?.sentences).toHaveLength(3);
    expect(invoke.mock.calls[0][1].body).toEqual({ action: "open", session_id: "sess-123456" });
    invoke.mockRejectedValue(new Error("réseau"));
    expect(await openAvatarBriefing("now", null)).toBeNull();
    invoke.mockResolvedValue({ data: null, error: { context: { status: 500 } } });
    expect(await fetchAvatarPrefs()).toBeNull();
  });

  it("set_prefs : seul le patch part, sans identifiant d'utilisateur", async () => {
    invoke.mockResolvedValue({ data: { ok: true, prefs: { cadence: "weekly", welcome: true, quiet_start: 21, quiet_end: 7 } }, error: null });
    const saved = await saveAvatarPrefs({ cadence: "weekly" });
    expect(saved?.cadence).toBe("weekly");
    expect(invoke.mock.calls[0][1].body).toEqual({ action: "set_prefs", prefs: { cadence: "weekly" } });
  });
});

describe("avatar guide — rendu", () => {
  it("carte : accueil, 3 phrases, sections repliables, boutons, aide « Je peux aussi »", () => {
    const html = renderToStaticMarkup(<WaouhAvatarBriefingCard briefing={parseAvatarBriefing(briefing)!} onAction={() => {}} />);
    expect(html).toContain("Votre avatar");
    expect(html).toContain("Bon retour");
    expect(html).toContain("content de vous retrouver");
    expect(html).toContain("Prochaine étape : relancer le vendeur");
    expect(html).toContain("Ce que je fais");
    expect(html).toContain("Mes veilles");
    expect(html).toContain("Relancer le vendeur");
    expect(html).toContain("Régler mes points");
    expect(html).toContain("Je peux aussi");
    expect(html).toMatch(/<details[^>]*open=""[^>]*>[\s\S]*Prochaines étapes/); // la section « next » est ouverte
  });

  it("ancien point : une seule ligne repliée, sans boutons", () => {
    const html = renderToStaticMarkup(<WaouhAvatarBriefingCard briefing={parseAvatarBriefing(briefing)!} collapsed />);
    expect(html).toContain("avatar-briefing-collapsed");
    expect(html).not.toContain("Relancer le vendeur");
    expect(html).toContain("Prochaine étape");
  });

  it("barre du guide : état, « Faire le point », réglages accessibles", () => {
    const prefs = { welcome: true, cadence: "daily" as const, quiet_start: 21, quiet_end: 7, last_briefing_at: null, next_briefing_at: "2999-01-01T00:00:00Z" };
    const html = renderToStaticMarkup(<WaouhAvatarGuideBar prefs={prefs} busy={false} onPoint={() => {}} />);
    expect(html).toContain("Faire le point");
    expect(html).toContain("Régler les points de l&#x27;avatar");
    expect(html).toContain("Prochain point");
    const busy = renderToStaticMarkup(<WaouhAvatarGuideBar prefs={prefs} busy onPoint={() => {}} />);
    expect(busy).toContain("Je fais le point…");
  });
});
