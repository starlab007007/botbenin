import { permitsExternalWhatsApp } from "./waouh-external-contact-permission.ts";
import assert from "node:assert/strict";
import { collectionSources, extractNotices, noticeDeadline, sourceKeyFor } from "./waouh-collection/sources.ts";
import { discoveryRecordCurrent } from "./waouh-discovery-records.ts";
import { publicNexusResult } from "./waouh-public-discovery.ts";

Deno.test("official dates use the publisher's timezone and reject impossible dates", () => {
  assert.equal(noticeDeadline("18 Nov 2026 à 12:00", "+01:00"), "2026-11-18T11:00:00.000Z");
  assert.equal(noticeDeadline("7 décembre 2026", "+00:00"), "2026-12-07");
  assert.equal(noticeDeadline("31 février 2026", "+01:00"), null);
  assert.equal(noticeDeadline("18 Nov 2026 à 24:00", "+01:00"), null);
});

Deno.test("publisher links remain canonical and notices expose a source-only action", () => {
  const source = collectionSources.benin_government_jobs;
  const html = `
    <article><h3><a href="/opportunite/99/recrutement/?utm_medium=test">Recrutement de secrétaire</a></h3>
    <p>Contact personnel : +229 01 23 45 67 89</p>
    <span>Clôture : </span><span>18 Nov 2026 à 12:00</span></article>
    <article><h3><a href="https://unknown.example/opportunite/50/test/">Ne pas collecter</a></h3>
    <span>Clôture : </span><span>19 Nov 2026 à 12:00</span></article>`;
  const result = extractNotices(html, source);
  assert.equal(result.candidates, 1);
  assert.equal(result.notices[0].url, "https://www.gouv.bj/opportunite/99/recrutement/");
  assert.equal(sourceKeyFor("https://www.gouv.bj/opportunites/offres-emploi/?x=1"), undefined);
  const row = { source_url: result.notices[0].url, subject: result.notices[0].title, contactability_level: "C0",
    evidence: {offer_kind: "announcement", deadline: result.notices[0].deadline} };
  const publicRow = publicNexusResult(row);
  assert.equal(publicRow.contact_policy.can_auto_contact, false);
  assert.equal(publicRow.contact_policy.can_reveal, false);
  assert.equal(publicRow.source_url, result.notices[0].url);
  assert.equal(discoveryRecordCurrent(row, Date.parse("2026-11-18T10:59:00Z")), true);
  assert.equal(discoveryRecordCurrent(row, Date.parse("2026-11-18T11:01:00Z")), false);
});

Deno.test("external WhatsApp needs channel-specific authorization", () => {
  const authorized = {channel: "whatsapp", consent_state: "opt_in", contactability_level: "C3"};
  assert.equal(permitsExternalWhatsApp(authorized), true);
  assert.equal(permitsExternalWhatsApp({...authorized, consent_state: "unknown"}), false);
  assert.equal(permitsExternalWhatsApp({...authorized, consent_state: "public_business"}), false);
  assert.equal(permitsExternalWhatsApp({...authorized, consent_state: "revoked"}), false);
  assert.equal(permitsExternalWhatsApp({...authorized, channel: "phone"}), false);
  assert.equal(permitsExternalWhatsApp({...authorized, contactability_level: "C0"}), false);
});

Deno.test("a BOAD notice retains an explicitly published closing time and timezone", () => {
  const row = {
    id: 99, link: "/fr/opportunites/appels-doffre/exemple/", title: "Exemple de marché public",
    acf: {end_at: "19/01/2027", presentation: {text_left: "<p>Date limite de soumission : 19 Janvier 2027 à 10 h 00 heure locale (GMT+1)</p>"}},
    project_status: [{slug: "tender_notice"}],
  };
  const payload = JSON.stringify({props: {tenders: {data: [row]}}}).replaceAll('"', "&quot;");
  const html = `<div data-page="${payload}"></div>`;
  const [notice] = extractNotices(html, collectionSources.waemu_boad_procurement).notices;
  assert.equal(notice.deadline, "2027-01-19T09:00:00.000Z");
  const result = publicNexusResult({ source_key: "waemu_boad_procurement", intent: "ANNOUNCE",
    source_url: notice.url, evidence: {deadline: "2027-01-19"}, expires_at: "2027-01-19T00:00:00Z" });
  assert.equal(result.contact_policy.label, "Voir l’avis officiel");
  assert.equal(result.public_facts.expires_at, undefined);
});
