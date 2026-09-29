// Notes de l'avatar : lecture défensive des métadonnées, libellés, et rendu du stepper / de la synthèse.
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { followUpLabel, offerGauge, parseAvatarProgress, parseAvatarSynthesis, STANCE_LABEL } from "../avatarNotes";
import { WaouhAvatarProgress, WaouhAvatarSynthesis } from "@/components/waouh/WaouhAvatarProgress";
import { commerceRequestFromButton } from "../commerceAction";

const steps = [
  { key: "verified", label: "Annonce vérifiée", state: "done" },
  { key: "room", label: "Deal Room ouverte", state: "done" },
  { key: "offer", label: "Offre préparée", state: "done" },
  { key: "sent", label: "Offre transmise", state: "current" },
  { key: "follow", label: "Suivi actif", state: "todo" },
  { key: "reply", label: "Réponse du vendeur", state: "todo" },
];

describe("notes de l'avatar", () => {
  it("lecture défensive : données invalides ignorées, jamais d'exception", () => {
    expect(parseAvatarProgress(null)).toBeNull();
    expect(parseAvatarProgress("x")).toBeNull();
    expect(parseAvatarProgress([{ label: "seul", state: "done" }])).toBeNull();
    expect(parseAvatarProgress([{ label: "a", state: "bizarre" }, { label: "b", state: "done" }, { label: "c", state: "todo" }])?.length).toBe(2);
    expect(parseAvatarSynthesis({})).toBeNull();
    expect(parseAvatarSynthesis({ offer: "abc" })).toBeNull();
    expect(parseAvatarSynthesis({ offer: 130000, stance: "n'importe quoi" })?.stance).toBe("unknown");
  });

  it("jauge de l'offre et libellés de posture", () => {
    expect(offerGauge({ offer: 130000, listPrice: 150000 })).toBe(87);
    expect(offerGauge({ offer: 200000, listPrice: 150000 })).toBe(100);
    expect(offerGauge({ offer: 1, listPrice: null })).toBeNull();
    expect(STANCE_LABEL.ambitious).toBe("Offre ambitieuse");
  });

  it("libellé du prochain point de suivi", () => {
    const now = new Date("2026-09-29T08:00:00Z");
    expect(followUpLabel("2026-09-30T08:00:00Z", now)).toBe("demain");
    expect(followUpLabel("2026-09-29T13:00:00Z", now)).toBe("dans 5 h");
    expect(followUpLabel("2026-10-02T08:00:00Z", now)).toBe("dans 3 jours");
    expect(followUpLabel("2026-09-29T07:00:00Z", now)).toBe("maintenant");
    expect(followUpLabel(null, now)).toBe("bientôt");
  });

  it("stepper : 6 points, étape courante annoncée aux lecteurs d'écran, compteur", () => {
    const html = renderToStaticMarkup(<WaouhAvatarProgress progress={steps} />);
    expect(html).toContain("Offre transmise");
    expect(html).toContain('aria-current="step"');
    expect(html).toContain("3/6 points notés");
    expect(html).toContain("en cours");
    expect(renderToStaticMarkup(<WaouhAvatarProgress progress={undefined} />)).toBe("");
  });

  it("synthèse : offre, prix affiché, jauge, conseil si offre ambitieuse, suivi", () => {
    const html = renderToStaticMarkup(
      <WaouhAvatarSynthesis synthesis={{ offer: 90000, listPrice: 150000, gapPct: -40, stance: "ambitious", suggested: 127500, level: "C1", etaHours: 24, nextFollowUpAt: "2999-01-01T00:00:00Z" }} />,
    );
    expect(html).toContain("Synthèse de l&#x27;avatar");
    expect(html).toContain("Offre ambitieuse");
    expect(html).toMatch(/90[\s  ]000 FCFA/);
    expect(html).toContain('aria-valuenow="60"');
    expect(html).toMatch(/127[\s  ]500 FCFA/);
    expect(html).toContain("-40 %");
    expect(html).toContain("sous 24 h");
    expect(renderToStaticMarkup(<WaouhAvatarSynthesis synthesis={null} />)).toBe("");
  });

  it("boutons de l'avatar → actions serveur (relance, veille)", () => {
    const id = "d1a00000-0000-4000-8000-000000000001";
    expect(commerceRequestFromButton(`relancer:${id}`, { thread_id: "t" })).toEqual({ action: "transmit_offer", negotiation_id: id, thread_id: "t", follow_up: true });
    expect(commerceRequestFromButton(`veille:${id}`)).toEqual({ action: "watch_offer", negotiation_id: id, thread_id: null });
  });
});
