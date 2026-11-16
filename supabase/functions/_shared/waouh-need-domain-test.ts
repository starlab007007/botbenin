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
