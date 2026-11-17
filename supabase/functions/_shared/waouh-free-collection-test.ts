import assert from "node:assert/strict";
import {goAfricaProviders,publicDeadline,rssAtomListings,structuredPublicListings,telegramPublicListings} from "./waouh-collection/public.ts";
import {productIdentity,coinAfriqueCatalog} from "./waouh-collection/commerce.ts";
import {freeDiscoveryPlan,marketReference,procurementBuyerSignal} from "./waouh-free-discovery.ts";
import {scoreFabricSignal,redactPublicContacts} from "./waouh-signal-fabric.ts";
import {missionMatches} from "./waouh-mission-domain.ts";
const now=Date.parse("2026-11-17T12:00:00Z"),credit={attribution:"Publication originale"};

Deno.test("RSS preserves academic years and drops expired, undated and foreign opportunities",()=>{
 const xml=`<rss xmlns:content="urn:content"><channel>
 <item><title>Bourses universitaires 2026-2027</title><link>https://school.bj/bourse</link><pubDate>Mon, 05 Oct 2026 11:00:00 GMT</pubDate><content:encoded><![CDATA[<p>La demande prendra fin le vendredi 05 février 2027 à minuit.</p>]]></content:encoded></item>
 <item><title>Formation ancienne</title><link>https://school.bj/old</link><pubDate>Mon, 05 Oct 2020 11:00:00 GMT</pubDate></item>
 <item><title>Formation fermée</title><link>https://school.bj/closed</link><pubDate>Mon, 16 Nov 2026 11:00:00 GMT</pubDate><description>Date limite : 16 novembre 2026</description></item>
 <item><title>Formation hors du site</title><link>https://foreign.org/x</link><pubDate>Mon, 16 Nov 2026 11:00:00 GMT</pubDate></item>
 </channel></rss>`;
 const [row,...others]=rssAtomListings(xml,new URL("https://school.bj/feed/"),credit,now);
 assert.equal(row.evidence.deadline,"2027-02-05");assert.match(row.product_name,/2026-2027/);assert.equal(others.length,0);
 assert.equal(publicDeadline("Formation du 01 janvier 2027, inscriptions ouvertes"),undefined);
 assert.equal(publicDeadline("Date limite : 31 février 2027"),undefined);
});

Deno.test("Atom keeps the alternate source and declares an unpublished deadline",()=>{
 const rows=rssAtomListings(`<feed><entry><title>Formation informatique</title><link rel="alternate" href="https://school.bj/f"/><updated>2026-11-16T09:00:00Z</updated><summary>Session proposée.</summary></entry></feed>`,new URL("https://school.bj/feed"),credit,now);
 assert.equal(rows[0].source_url,"https://school.bj/f");assert.equal(rows[0].evidence.deadline_status,"not_published");
 assert.throws(()=>rssAtomListings("<html>Site unavailable</html>",new URL("https://school.bj/feed"),credit,now),/source_format_changed/);
});

Deno.test("directory contacts stay scoped to their company card and unrelated sponsored cards are excluded",()=>{
 const rows=goAfricaProviders(`<a href="tel:+2290122222222">Plateforme</a>
 <article><h2><a href="/bj/111-atelier-plomberie-cotonou-benin">Atelier Bleu</a></h2><p>Cotonou</p><a href="tel:+2290112345678">Appeler</a><img src="https://www.goafricaonline.com/profile.jpg"/></article>
 <article><h2><a href="/bj/222-materiaux-construction-cotonou">Matériaux</a></h2></article>`,new URL("https://www.goafricaonline.com/bj/annuaire/plomberie-sanitaires"),{...credit,category:"Plomberie"});
 assert.equal(rows.length,1);assert.equal(rows[0].evidence.offer_kind,"service");
 assert.deepEqual(rows[0].contacts?.map(c=>c.channel),["website","phone"]);
 assert.equal(rows[0].contacts?.[1].value,"+2290112345678");assert.equal(rows[0].evidence.photos,undefined);
 assert.equal(missionMatches({...rows[0],subject:rows[0].product_name,fabric_id:'external:1'},{missionKind:'service'}),true);
});

Deno.test("JSON-LD recursively supports products, services, courses and job postings",()=>{
 const html='<script type="application/ld+json">'+JSON.stringify({'@graph':[{'@type':'ItemList',itemListElement:[{item:{'@type':'JobPosting',title:'Recrutement comptable',url:'/jobs/1',datePosted:'2026-11-16',validThrough:'2026-12-01'}}]},
 {'@type':'Course',name:'Formation terminée',url:'/closed',datePublished:'2026-11-01',endDate:'2026-11-15'},
 {'@type':'Service',name:'Installation électrique',url:'/service',offers:{price:'25000',priceCurrency:'XOF'}},
 {'@type':'Product',name:'Téléphone Samsung S20',url:'/product',model:'S20',offers:{price:50000,priceCurrency:'XOF'}},
 {'@type':'Product',name:'Copie étrangère',url:'https://foreign.org/1',offers:{price:1,priceCurrency:'XOF'}}]})+'</script>';
 const rows=structuredPublicListings(html,new URL('https://school.bj/index'),credit,now);
 assert.deepEqual(rows.map(r=>r.intent),['ANNOUNCE','SELL','SELL']);
 assert.equal(rows[0].evidence.deadline,'2026-12-01');assert.equal(rows[1].evidence.offer_kind,'service');assert.equal(rows[2].model,'S20');
});

Deno.test("Telegram filters stale posts, other channels, ordinary news and unrelated countries",()=>{
 const post=(id:string,date:string,body:string)=>`<div class="tgme_widget_message" data-post="${id}"><time datetime="${date}"></time><div class="tgme_widget_message_text">${body}</div></div>`;
 const html=post('market/1','2026-11-16T09:00:00Z','Je cherche un iPhone 13 à Cotonou, 150 000 FCFA')+
 post('market/2','2026-11-16T09:00:00Z','Recrutement au Bénin : comptable')+
 post('market/3','2024-11-16T09:00:00Z','Recrutement au Bénin : comptable')+
 post('foreign/4','2026-11-16T09:00:00Z','Moto à vendre au Bénin')+
 post('market/5','2026-11-16T09:00:00Z','Recrutement à Abidjan')+
 post('market/6','2026-11-16T09:00:00Z','Actualité sportive au Bénin');
 const rows=telegramPublicListings(html,new URL('https://t.me/s/market'),{...credit,country_scope:'BJ'},now);
 assert.deepEqual(rows.map(r=>r.intent),['BUY','ANNOUNCE']);assert.equal(rows[0].source_url,'https://t.me/market/1');
 assert.throws(()=>telegramPublicListings('<html>Site unavailable</html>',new URL('https://t.me/s/market'),credit,now),/source_format_changed/);
});

Deno.test("ranking rejects wrong domains and a city or hidden contact placeholder cannot justify a match",()=>{
 const score=(query:string,subject:string,raw_text='')=>scoreFabricSignal({query,mode:'find_sellers',city:'Cotonou',signal:{subject,raw_text,city:'Cotonou',intent:'SELL'}}).relevance_score;
 assert.equal(score('formation informatique','Recrutement informaticien'),0);
 assert.equal(score('réparer une moto','Moto à vendre'),0);
 assert.equal(score('plombier Cotonou','Téléphone à vendre'),0);
 assert.equal(score('téléphone','Objets divers','Appel [téléphone]'),0);
 assert.equal(score('emploi informaticien','Emploi secrétaire'),0);
 assert.equal(score('formation informatique','Formation en couture'),0);
 assert.ok(score('fuite d’eau','Plombier pour une plomberie')>0);
 assert.equal(scoreFabricSignal({query:'iPhone 13',mode:'find_sellers',signal:{subject:'iPhone 11',model:'11',intent:'SELL'}}).relevance_score,0);
 assert.equal(score('Samsung S10','Samsung S25 neuf'),0);
 assert.equal(scoreFabricSignal({query:'Samsung S10',mode:'find_sellers',signal:{subject:'Samsung S25 neuf',model:'corve pro',intent:'SELL'}}).relevance_score,0);
 assert.ok(score('réparer mon téléphone','Réparation de téléphones')>0);
});

Deno.test("sale references compare the same model and currency, with no invented price",()=>{
 const rows=[{fabric_id:'1',subject:'Samsung S20',model:'S20',intent:'SELL',price_min:50000,currency:'XOF'},
 {fabric_id:'2',subject:'Samsung S20',model:'S20',intent:'SELL',price_min:70000,currency:'XOF'},
 {fabric_id:'3',subject:'Samsung S21',model:'S21',intent:'SELL',price_min:90000,currency:'XOF'},
 {fabric_id:'4',subject:'Samsung S20',model:'S20',intent:'SELL',price_min:100,currency:'EUR'}];
 assert.deepEqual(marketReference('Samsung S20',rows),{minimum:50000,maximum:70000,median:60000,currency:'XOF',sample_size:2,basis:'Prix demandés dans les annonces comparables, hors frais et négociation'});
 assert.equal(marketReference('iPhone 13',rows),null);
});

Deno.test("a public purchase notice becomes an RFQ for sellers while employment stays an announcement",()=>{
 assert.equal(procurementBuyerSignal({intent:'ANNOUNCE',source_key:'waemu_bceao_procurement'}).intent,'RFQ');
 assert.equal(procurementBuyerSignal({intent:'ANNOUNCE',source_key:'benin_government_jobs'}).intent,'ANNOUNCE');
 const plan=freeDiscoveryPlan('plombier à Cotonou budget 25000 FCFA',{});
 assert.equal(plan.city,'Cotonou');assert.equal(plan.budget_max,25000);assert.equal(plan.domain,'service');
 assert.doesNotMatch(plan.normalized_query,/25000/);
 const phone=freeDiscoveryPlan('Samsung S10 Cotonou 150 000 FCFA',{});
 assert.equal(phone.budget_max,150000);assert.equal(phone.normalized_query,'Samsung S10 Cotonou');
});

Deno.test("published identities and academic years are preserved without inventing models",()=>{
 assert.equal(missionMatches({fabric_id:'legacy:1',intent:'SELL',category:'Recrutement',subject:'Hôtesse événementielle'},{missionKind:'opportunity'}),false);
 assert.deepEqual(productIdentity('Samsung Galaxy S20 128gb'),{brand:'Samsung',model:'Galaxy S20'});
 assert.equal(productIdentity('Objet inconnu').model,undefined);
 assert.equal(redactPublicContacts('Bourses 2026-2027 · +229 01 12 34 56 78'),'Bourses 2026-2027 · [téléphone]');
 const [row]=coinAfriqueCatalog('<article class="ad__card"><p class="ad__card-description"><a href="/annonce/cours-particuliers/cours-1">Cours d’espagnol</a></p></article>',new URL('https://bj.coinafrique.com/categorie/services'),credit);
 assert.equal(row.evidence.offer_kind,'service');
});
