import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WaouhMessageText } from "../WaouhMessageText";
import { WaouhProductResults } from "../WaouhProductCard";
import { chatMessagePreview, formatAssistantText, legacyOfferSections } from "@/lib/waouh/messagePresentation";

const legacy = "*🎯 Top 2 annonces trouvées*\n━━━━━━━━━━\n*1. Samsung S25*\n💰 *350 000 FCFA*\n📍 Cotonou\n━━━━━━━━━━\n*2. Pixel 8*\n💰 *250 000 FCFA*\n📍 Calavi";

describe("présentation compacte des messages", () => {
  it("résume un payload sans exposer son JSON et conserve le prix zéro", () => {
    const preview = chatMessagePreview(JSON.stringify({ results: [{ title: "Stylo", price: 0 }, { title: "Bic" }] }));
    expect(preview).toBe("2 offres · Stylo · 0 FCFA");
  });
  it("borne les aperçus et retire les marqueurs WhatsApp et les séparateurs", () => {
    const preview = chatMessagePreview(legacy + "\n" + "Suite ".repeat(100));
    expect(preview.length).toBeLessThanOrEqual(140);
    expect(preview).not.toMatch(/\*|━|\n/);
  });
  it("convertit le gras WhatsApp sans altérer Markdown et blocs de code", () => {
    expect(formatAssistantText("*Prix* **État** `*code*`\n```txt\n*brut*\n```"))
      .toBe("**Prix** **État** `*code*`\n```txt\n*brut*\n```");
  });
  it("transforme une ancienne sélection en cartes de lecture sans inventer d’action", () => {
    expect(legacyOfferSections(legacy).map(offer => offer.title)).toEqual(["Samsung S25", "Pixel 8"]);
    const html = renderToStaticMarkup(<WaouhMessageText text={legacy} />);
    expect((html.match(/<article/g) || [])).toHaveLength(2);
    expect(html).toContain("350 000 FCFA");
    expect(html).not.toContain("<button");
  });
  it("ne convertit pas une liste ordinaire ou une réponse déjà accompagnée de résultats", () => {
    expect(legacyOfferSections("1. Vérifier\n2. Confirmer")).toEqual([]);
    expect(renderToStaticMarkup(<WaouhMessageText text={legacy} hasResults />)).not.toContain("<article");
  });
  it("préserve le texte utilisateur et neutralise HTML et liens exécutables", () => {
    expect(renderToStaticMarkup(<WaouhMessageText text="*Mon texte*" isUser />)).toContain("*Mon texte*");
    const html = renderToStaticMarkup(<WaouhMessageText text={'<script>alert(1)</script>\n[Ouvrir](javascript:alert(1))'} />);
    expect(html).not.toContain("<script>");
    expect(html).not.toContain('href="javascript:');
  });
  it("préserve les tableaux et la fin des longues réponses dans un volet", () => {
    const table = "| Article | Prix |\n| --- | --- |\n| Stylo | 100 FCFA |";
    expect(renderToStaticMarkup(<WaouhMessageText text={table} />)).toContain("<table>");
    const html = renderToStaticMarkup(<WaouhMessageText text={"Résumé.\n\n" + "Détail ".repeat(200) + "FIN"} />);
    expect(html).toContain("<details");
    expect(html).toContain("FIN");
  });
  it("ne présente pas une mesure absente comme un score nul", () => {
    const html = renderToStaticMarkup(<WaouhProductResults results={[{ id: "a", index: 1, title: "Stylo", price: 100 }]} />);
    expect(html).not.toContain("Match 0%");
    expect(html).not.toContain("Confiance 0%");
  });
});
