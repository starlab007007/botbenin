import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assessQuality, compareUnified, qualityAdjustedScore, referenceLine } from "./waouh-unified-quality.ts";

const full = { photos: ["https://x/a.jpg"], price_min: 5000, contactability_level: "C2", actor_type: "seller" };
const noPhoto = { price_min: 5000, contactability_level: "C4", actor_type: "business" };
const nothing = { contactability_level: "C0", actor_type: "announcer", evidence: {} };

Deno.test("qualité : complète, partielle, vide — mêmes règles pour toutes les sources", () => {
  assertEquals(assessQuality(full).tier, "A");
  assertEquals(assessQuality(full).reference, null);
  const b = assessQuality(noPhoto);
  assertEquals([b.tier, b.missing, b.entity_kind], ["B", ["photo"], "business"]);
  const d = assessQuality(nothing);
  assertEquals([d.tier, d.present, d.completeness, d.entity_kind], ["D", 0, 0, "announcer"]);
  assertEquals(d.reference?.includes("contacter la source"), true);
});

Deno.test("photo : évidence (photos, image_url), contact : niveau C1+ ou quatre derniers chiffres", () => {
  assertEquals(assessQuality({ evidence: { image_url: "https://x/i.png" }, price: 10 }).has_photo, true);
  assertEquals(assessQuality({ evidence: { photos: ["pas-une-url"] } }).has_photo, false);
  assertEquals(assessQuality({ evidence: { contact_last4: "1234" } }).has_contact, true);
  assertEquals(assessQuality({ evidence: { has_whatsapp: true } }).has_contact, true);
  assertEquals(assessQuality({ contactability_level: "C0" }).has_contact, false);
  assertEquals(assessQuality({ price: 0, price_min: null, price_max: "" }).has_price, false);
  assertEquals(assessQuality({ price_max: "12 500" }).has_price, true);
});

Deno.test("types d'acteur : acheteur, service, annonceur, éclaireur", () => {
  assertEquals(assessQuality({ intent: "BUY" }).entity_kind, "buyer");
  assertEquals(assessQuality({ category: "Services à domicile", actor_type: "seller" }).entity_kind, "service");
  assertEquals(assessQuality({ actor_type: "scout" }).entity_kind, "scout");
  assertEquals(assessQuality({}).entity_kind, "unknown");
});

Deno.test("classement équitable : les fiches vides en dernier, sinon score corrigé", () => {
  const mk = (row: Record<string, unknown>, total: number) => { const quality = assessQuality(row); return { quality, adjusted: qualityAdjustedScore(total, quality) }; };
  const items = [mk(nothing, 95), mk(noPhoto, 70), mk(full, 66), mk({ price_min: 1, contactability_level: "C0" }, 90)];
  const sorted = [...items].sort(compareUnified);
  // une fiche très pertinente mais incomplète (90 → 74) reste devant une fiche complète peu pertinente (66) ; la fiche vide est toujours dernière
  assertEquals(sorted.map((i) => i.quality.tier), ["C", "A", "B", "D"]);
  // même fiche, même score, quelle que soit la source : aucun biais
  assertEquals(qualityAdjustedScore(80, assessQuality({ ...full, source_key: "radar_ia" } as never)), qualityAdjustedScore(80, assessQuality({ ...full, source_key: "partner" } as never)));
});

Deno.test("phrase de référence", () => {
  assertEquals(referenceLine([]), null);
  assertEquals(referenceLine(["price", "photo"]), "Non renseigné : prix, photo. Demandez-le à l'Avatar avant de vous engager.");
});

Deno.test("une demande d'achat n'est pas pénalisée pour l'absence de photo", () => {
  const q = assessQuality({ intent: "BUY", actor_type: "buyer", price_max: 50000, contactability_level: "C2" });
  assertEquals([q.tier, q.missing, q.has_photo], ["A", [], true]);
});
