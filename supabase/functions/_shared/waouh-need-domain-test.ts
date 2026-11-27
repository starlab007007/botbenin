import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { matchVerdict, needDomain, signalDomain } from "./waouh-need-domain.ts";

const phone = { subject: "Galaxy S25 - Cell Phones - Cotonou, Benin", category: "Smartphone", brand: "Samsung", model: "S25" };
const jobAsk = { subject: "Je cherche une opportunité : un travail de secrétaire à Abomey-Calavi" };

Deno.test("le domaine d'un besoin est lu dans ses mots", () => {
  assertEquals(needDomain("un travail de secrétaire"), "job");
  assertEquals(needDomain("maison à louer 2 chambres"), "property");
  assertEquals(needDomain("moto occasion"), "vehicle");
  assertEquals(needDomain("plombier pour une fuite"), "service");
  assertEquals(needDomain("riz parfumé 25 kg"), "unknown");
});

Deno.test("une recherche d'emploi ne renvoie jamais un téléphone", () => {
  const v = matchVerdict("Je cherche une opportunité : un travail de secrétaire", phone);
  assertEquals(v.domain, "job");
  assertEquals(signalDomain(phone), "goods");
  assertEquals(v.acceptable, false);
});

Deno.test("une vente de ventilateur ne propose pas un acheteur d'emploi ni de gommage", () => {
  assertEquals(matchVerdict("Je vends : ventilateur", jobAsk).acceptable, false);
  assertEquals(matchVerdict("Je vends : ventilateur", { subject: "gommage corps et visage" }).acceptable, false);
});

Deno.test("un vrai rapprochement reste accepté, et le besoin précis est reconnu", () => {
  const exact = matchVerdict("Je cherche un Galaxy S25", phone);
  assertEquals(exact.acceptable, true);
  assertEquals(exact.exact, true);
  const partial = matchVerdict("Je cherche un Galaxy S24 noir 256 Go", phone);
  assertEquals(partial.acceptable, true);
  assertEquals(partial.exact, false);
  assertEquals(matchVerdict("plombier à Cotonou", { subject: "Plomberie et dépannage", category: "Services" }).acceptable, true);
});

Deno.test("les mots vides ne justifient jamais un rapprochement", () => {
  assertEquals(matchVerdict("je cherche", phone).acceptable, false);
  assertEquals(matchVerdict("je veux acheter quelque chose de bon état", phone).acceptable, false);
});

Deno.test("les mots du gabarit de demande ne valent pas rapprochement", () => {
  // « opportunité » vient de la phrase générée, et le nom d'un groupe d'annonces le contient souvent.
  assertEquals(matchVerdict("Je cherche une opportunité : un travail de secrétaire à Abomey-Calavi", {
    subject: "Galaxy S25 - Cell Phones", raw_text: "ventes achats et opportunités d'affaires au Bénin",
  }).acceptable, false);
  assertEquals(matchVerdict("Je cherche une opportunité : un stage en informatique", { subject: "Stage informatique · assistant" }).acceptable, true);
});

Deno.test("une pièce, un accessoire ou un moule de l'objet n'est pas l'objet lui-même", () => {
  // Faux positifs réels identifiés dans la collecte (diagnostic du 2026-11-27) : le mot-clé
  // central est partagé, mais l'annonce parle d'un composant industriel, pas du bien cherché.
  assertEquals(matchVerdict("ventilateur", { subject: "Moule pour ventilateur", category: "Moules de fonderie" }).acceptable, false);
  assertEquals(matchVerdict("je cherche un électricien", { subject: "Machine à coudre industrielle", category: "Couture" }).acceptable, false);
  // Un vrai ventilateur, même avec un accessoire mentionné en plus, reste accepté.
  assertEquals(matchVerdict("ventilateur", { subject: "Ventilateur sur pied avec télécommande", category: "Électroménager" }).acceptable, true);
  // Si le besoin demande lui-même une pièce détachée, ce n'est plus un faux positif.
  assertEquals(matchVerdict("pièce détachée pour ventilateur", { subject: "Pièce détachée moteur ventilateur", category: "Pièces détachées" }).acceptable, true);
});

Deno.test("la ville ne prouve jamais la pertinence", () => {
  const place = "Abomey-Calavi";
  assertEquals(matchVerdict("Je cherche une opportunité : un travail de secrétaire à Abomey-Calavi",
    { subject: "Galaxy S25 - Cell Phones - Cotonou, Benin", city: place }, { place }).acceptable, false);
  assertEquals(matchVerdict("Je cherche une opportunité : un poste de secrétaire à Abomey-Calavi",
    { subject: "Secrétaire administrative", city: place }, { place }).acceptable, true);
});
