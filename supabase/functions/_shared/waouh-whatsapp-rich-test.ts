// Tests de la mise en forme WhatsApp premium (exécutables avec `deno test` ou `node --experimental-strip-types`).
import assert from "node:assert/strict";
import { richWhatsAppText } from "./waouh-whatsapp-rich.ts";

const runner: any = (globalThis as any).Deno?.test ?? (await import("node:test")).test;

runner("une réponse courte reste propre : seuls les montants passent en gras", () => {
  assert.equal(richWhatsAppText("Le ventilateur coûte 25 000 FCFA."), "Le ventilateur coûte *25 000 FCFA*.");
});

runner("le Markdown devient la syntaxe native WhatsApp", () => {
  const out = richWhatsAppText("## Résultats\n**Ventilateur** à Cotonou\n- Prix : 25000 FCFA\n- Livraison : oui\n1. Choisir\n2. Négocier");
  assert.ok(out.startsWith("*Résultats*"));
  assert.ok(out.includes("*Ventilateur* à Cotonou"));
  assert.ok(out.includes("• *Prix* : *25000 FCFA*"));
  assert.ok(out.includes("• *Livraison* : oui"));
  assert.ok(out.includes("1️⃣ Choisir") && out.includes("2️⃣ Négocier"));
  assert.ok(!out.includes("**") && !out.includes("##"));
});

runner("les tableaux Markdown sont convertis en lignes lisibles", () => {
  const out = richWhatsAppText("| Offre | Prix |\n|---|---|\n| Ventilateur | 25 000 FCFA |");
  assert.ok(out.includes("*Offre · Prix*"));
  assert.ok(out.includes("• Ventilateur · *25 000 FCFA*"));
  assert.ok(!out.includes("---"));
});

runner("un message structuré reçoit un titre en gras et une signature", () => {
  const out = richWhatsAppText("Voici 3 offres à Cotonou :\n- Offre A : 15 000 FCFA\n- Offre B : 18 000 FCFA\n- Offre C : 25 000 FCFA");
  assert.ok(out.startsWith("*Voici 3 offres à Cotonou*"));
  assert.ok(out.endsWith("_✨ WAOUH · bot.bj_"));
});

runner("idempotent, et n'ajoute pas de signature aux messages déjà mis en page", () => {
  const samples = [
    "Voici 3 offres :\n- A : 1 000 FCFA\n- B : 2 000 FCFA\n- C : 3 000 FCFA",
    "Bonjour, 15 000 FCFA ?",
    "━━━━━━━━━━━━━━━━━━\n*Carte*\n━━━━━━━━━━━━━━━━━━\n• *Montant* : 5 000 FCFA\n• a\n• b",
  ];
  for (const sample of samples) {
    const once = richWhatsAppText(sample);
    assert.equal(richWhatsAppText(once), once);
  }
  assert.equal(richWhatsAppText(samples[2]).match(/WAOUH · bot\.bj/g), null);
});

runner("le code, les liens et le texte vide sont préservés", () => {
  assert.equal(richWhatsAppText(""), "");
  const out = richWhatsAppText("Voir [la fiche](https://bot.bj/a/1)\n```\nprix = 5 000 FCFA\n```");
  assert.ok(out.includes("la fiche → https://bot.bj/a/1"));
  assert.ok(out.includes("prix = 5 000 FCFA\n```") && !out.includes("*5 000 FCFA*"));
});

runner("la signature peut être désactivée", () => {
  const out = richWhatsAppText("Voici :\n- a\n- b\n- c", { footer: false });
  assert.ok(!out.includes("WAOUH"));
});
