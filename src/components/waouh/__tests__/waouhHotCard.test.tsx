// Cartes produit « chaudes » : chaque carte propose l'entrée du parcours (je le veux / proposer un prix /
// poser une question) et mène à la fenêtre de négociation, jamais un simple « contacter ».
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WaouhProductResults } from "../WaouhProductCard";

const render = (results: any[]) => renderToStaticMarkup(<WaouhProductResults results={results} onAction={() => {}} />);
const base = { id: "a1", index: 1, title: "Vélo tout terrain", price: 300000, photos: [], source: "waouh" };

describe("cartes produit chaudes", () => {
  it("boutons fournis par le serveur : Je le veux à X, Proposer un prix, Poser une question", () => {
    const html = render([{ ...base, actions: [
      { id: "je-veux:a1", label: "Je le veux à 300 000 FCFA" },
      { id: "proposer-prix:a1", label: "Proposer un prix" },
      { id: "poser-question:a1", label: "Poser une question" },
    ] }]);
    expect(html).toContain("Je le veux à 300 000 FCFA");
    expect(html).toContain("Poser une question");
  });

  it("bouton intelligent : le prix suggéré (−10 %) est dans le libellé, avec « Autre montant »", () => {
    const html = render([base]);
    expect(html).toMatch(/Proposer 270[\s]000 FCFA/);
    expect(html).toContain("Autre montant");
  });

  it("sans boutons serveur : l'entrée du parcours est synthétisée avec le prix", () => {
    const html = render([base]);
    expect(html).toMatch(/Je le veux à 300[\s  ]000 FCFA/);
    expect(html).toMatch(/Proposer 270[\s]000 FCFA/);
    expect(html).toContain("Poser une question");
    expect(html).not.toContain("Je suis intéressé · ouvrir le Deal Room");
  });

  it("sans prix : « Je le veux » simple, la carte reste chaude", () => {
    const html = render([{ ...base, price: null }]);
    expect(html).toContain("Je le veux");
    expect(html).toContain("Proposer un prix");
    expect(html).not.toContain("Autre montant");
  });

  it("fiche sans action d'intérêt (action: null) : pas de bouton d'entrée fabriqué", () => {
    const html = render([{ ...base, action: null }]);
    expect(html).not.toContain("Je le veux");
  });

  it("demande d'achat (acheteur) : « Proposer mon offre », pas « Je le veux »", () => {
    const html = render([{ ...base, intent: "BUY", actor_type: "buyer" }]);
    expect(html).toContain("Proposer mon offre");
    expect(html).not.toContain("Je le veux");
  });

  it("aucun libellé « contacter le propriétaire » sur aucune carte", () => {
    for (const card of [base, { ...base, price: null }, { ...base, intent: "BUY" }]) {
      const html = render([card]);
      expect(html).not.toMatch(/Contacter le (vendeur|propriétaire)|Trouver un moyen de contacter|Contacter avec WAOUH/);
    }
  });
});
