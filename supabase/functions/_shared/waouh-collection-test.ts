import { catalogJson, coinAfriqueCatalog, coinAfriqueDetails, facebookCommercialPosts, facebookGroup, facebookListingDetails, facebookSource, schemaOrgCatalog, trustedHttps } from "./waouh-collection/commerce.ts";
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

Deno.test("catalogue qualifies the four commercial intents and preserves authorized credit", () => {
  const origin = new URL("https://bot.bj/catalogue.json");
  const permissions = { automation_authorized: true, media_reuse_authorized: true, attribution: "Partenaire pilote",
    media_hosts: ["photos.bot.bj"] };
  const items = [
    { kind: "product", intent: "SELL", url: "/vente/1?utm_source=p", title: "Perceuse professionnelle", price: "18000.00", currency: "XOF" },
    { kind: "product", intent: "BUY", url: "/achat/1", title: "Achat de perceuse", description: "Écrire à perso@outlook.com" },
    { kind: "service", intent: "RFQ", url: "/devis/1", title: "Réparation de moteur", price: 50, currency: "EUR" },
    { kind: "rare_item", intent: "SELL", url: "/rare/1", title: "Machine à écrire ancienne",
      photos: ["https://photos.bot.bj/rare.jpg", "https://photos.bot.bj/rare.jpg", "https://photos.bot.bj/privé.jpg?signature=abc", "https://foreign.org/photo.jpg"] },
    { kind: "product", intent: "SELL", url: "https://foreign.org/vente/1", title: "Copie hors du catalogue" },
  ];
  const rows = catalogJson({items}, origin, permissions);
  assert.deepEqual(rows.map(row => row.intent), ["SELL", "BUY", "RFQ", "SELL"]);
  assert.equal(rows[0].price_min, 18000);
  assert.equal(rows[0].source_url, "https://bot.bj/vente/1");
  assert.equal(rows[1].actor_type, "buyer");
  assert.doesNotMatch(rows[1].raw_text ?? "", /perso@outlook/);
  assert.equal(rows[2].evidence.offer_kind, "service");
  assert.equal(rows[2].price_min, undefined);
  assert.equal(rows[3].evidence.rare_item, true);
  assert.deepEqual(rows[3].evidence.photos, ["https://photos.bot.bj/rare.jpg"]);
  assert.equal(rows[3].evidence.photo_attribution, permissions.attribution);
  assert.equal(catalogJson({items}, origin, {...permissions, media_reuse_authorized:false})[3].evidence.photos, undefined);
  assert.equal(trustedHttps("https://127.0.0.1/source"), null);
});

Deno.test("structured site listings require an offer and keep the original provider credit", () => {
  const origin = new URL("https://bot.bj/catalogue/");
  const permissions = {attribution: "Partenaire pilote"};
  const html = '<script type="application/ld+json">' + JSON.stringify({"@graph":[
    {"@type":"Service",name:"Réparation automobile",url:"/services/10",offers:{"@type":"Offer",price:"20 000",priceCurrency:"XOF"}},
    {"@type":"Product",name:"Produit sans offre",url:"/produits/11"},
  ]}) + '</script>';
  assert.deepEqual(schemaOrgCatalog(html, origin, permissions).map(row => [row.evidence.offer_kind, row.price_min]), [["service", 20000]]);
  const directory = catalogJson({items:[{kind:"provider",intent:"ANNOUNCE",title:"Atelier du Centre",city:"Cotonou",
    category:"Couture",license:"ODbL-1.0",url:"https://www.openstreetmap.org/node/100"}]}, origin,
    {attribution:"© OpenStreetMap contributors · ODbL"}, true);
  assert.equal(directory[0].evidence.provider_profile, true);
  assert.equal(directory[0].evidence.listing_license, "ODbL-1.0");
  assert.ok(!directory[0].evidence.availability_confirmed);
});

Deno.test("Apify results are limited to commercial posts in the authorized Facebook group", () => {
  const group = facebookGroup("https://m.facebook.com/groups/market987?utm_source=search");
  assert.ok(group);
  assert.equal(facebookGroup("https://www.facebook.com/marketplace/"), null);
  const rows = facebookCommercialPosts([
    {url:"https://m.facebook.com/groups/market987/posts/1/?tracking=x",text:"Je vends une radio ancienne"},
    {url:"https://www.facebook.com/groups/foreign/posts/2/",text:"Je cherche une radio"},
    {url:"https://www.facebook.com/groups/market987/posts/3/",text:"Je cherche un service de dépannage"},
    {url:"https://www.facebook.com/groups/market987/posts/4/",text:"Bon dimanche à tous"},
  ], group, {attribution:"Groupe pilote"});
  assert.deepEqual(rows.map(row => row.intent), ["SELL", "BUY"]);
  assert.equal(rows[0].source_url, "https://www.facebook.com/groups/market987/posts/1/");
  assert.equal(rows[1].evidence.offer_kind, "service");
});

Deno.test("CoinAfrique keeps the listing identity, seller contact and credited photo separate", () => {
  const url="https://bj.coinafrique.com/annonce/meubles/chaise-12345";
  const permission={attribution:"Annonce originale CoinAfrique",media_reuse_authorized:true,media_hosts:["images.coinafrique.com"]};
  const [row]=coinAfriqueCatalog(`<article class="ad__card"><p class="ad__card-description"><a href="${url}">Chaise de bureau</a></p>
    <span data-ad-price="38 000" data-ad-category="Meubles"></span><img class="ad__card-img" src="https://images.coinafrique.com/thumb_12345_uploaded_image1.jpg"></article>`,new URL("https://bj.coinafrique.com/"),permission);
  assert.equal(row.price_min,38000);
  const detail=`<link rel="canonical" href="${url}"><meta property="og:image" content="https://images.coinafrique.com/12345_uploaded_image1.jpg">
    <a data-phone-number="+2290123456789"></a><img src="https://images.coinafrique.com/99999_other_listing.jpg">`;
  const enriched=coinAfriqueDetails(detail,row,permission);
  assert.deepEqual(enriched.evidence.photos,["https://images.coinafrique.com/12345_uploaded_image1.jpg"]);
  assert.equal(enriched.evidence.photo_attribution,permission.attribution);
  assert.equal(enriched.contacts?.filter(c=>c.channel==="phone").length,1);
  assert.doesNotMatch(JSON.stringify(enriched.evidence),/2290123456789/);
  assert.throws(()=>coinAfriqueDetails(detail.replace('rel="canonical"','rel="other"'),row,permission),/listing_identity_changed/);
});

Deno.test("Facebook share links bind returned posts to the requested input and preserve only post photos", () => {
  const source=facebookSource(" https://web.facebook.com/share/g/1EnAfmcbFk/ ");
  assert.ok(source);
  const post={inputUrl:source.href,facebookUrl:"https://www.facebook.com/groups/market987/",
    url:"https://www.facebook.com/groups/market987/posts/1/",text:"Disponible à vendre radio ancienne 25 000 FCFA",
    media:[{url:"https://www.facebook.com/media/set/?set=pcb.1&type=1"},{photo_image:{uri:"https://scontent-cdg4-1.xx.fbcdn.net/radio.jpg"}}]};
  const permission={attribution:"Publication originale",media_reuse_authorized:true};
  const [row]=facebookCommercialPosts([post],source,permission);
  assert.equal(row.price_min,25000);
  assert.equal(row.evidence.photos?.length,1);
  assert.equal(row.contacts?.[0].channel,"facebook");
  assert.equal(facebookCommercialPosts([{...post,inputUrl:"https://web.facebook.com/share/g/foreign/"}],source,permission).length,0);
  assert.equal(facebookSource("https://malicious.org/share/g/abc/"),null);
});

Deno.test("Facebook cards expose the actual subject, price and location instead of a phone or intro", () => {
  assert.deepEqual(facebookListingDetails("tél +229 01 23 45 67 89\n*SUZUKI BALENO Année 2025*\nPRIX: 7.800.000 FCFA"),
    {title:"SUZUKI BALENO Année 2025",price:7800000,category:"Automobile",city:undefined,country_code:"BJ"});
  const villa=facebookListingDetails("*Direct à la clé*\n*VILLA PERSONNELLE DISPONIBLE À GODOMEY*\nLoyer : 200.000f");
  assert.equal(villa.title,"VILLA PERSONNELLE DISPONIBLE À GODOMEY");assert.equal(villa.price,200000);
  const imported=facebookListingDetails("https://www.facebook.com/groups/12345/\nPièces détachées disponibles à Abobo");
  assert.equal(imported.country_code,"CI");assert.equal(imported.city,"Abobo");assert.doesNotMatch(imported.title,/https:/);
  const [post]=facebookCommercialPosts([{url:"https://www.facebook.com/groups/market987/posts/99/",text:"Moto disponible à vendre. WhatsApp ou appel direct 01 23 45 67 89"}],
    new URL("https://www.facebook.com/groups/market987/"),{attribution:"Publication originale"});
  assert.ok(post.contacts?.some(c=>c.channel==="phone"&&c.value.replace(/\D/g,"")==="0123456789"));
});
