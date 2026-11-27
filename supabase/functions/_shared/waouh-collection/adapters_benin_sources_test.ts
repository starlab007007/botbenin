import {assertEquals} from 'jsr:@std/assert@1';
import {detailUrl,extractListing} from './adapters.ts';
import {structuredPublicListings} from './public.ts';
import type {SourcePermission} from './commerce.ts';

const permission:SourcePermission={attribution:'Source de test · consulter l’annonce originale',collection_format:'schema_org',country_scope:'BJ'};

Deno.test('Emplois Bénin : une offre est une fiche, les rubriques non',()=>{
  assertEquals(detailUrl(new URL('https://emploisbenin.bj/post/43801')),true);
  assertEquals(detailUrl(new URL('https://emploisbenin.bj/category/16')),false);
  assertEquals(detailUrl(new URL('https://emploisbenin.bj/login')),false);
});

Deno.test('Gouvernement : une opportunité est une fiche, la liste non',()=>{
  assertEquals(detailUrl(new URL('https://www.gouv.bj/opportunite/193/recrutement-multipostes-unite-gestion/')),true);
  assertEquals(detailUrl(new URL('https://www.gouv.bj/opportunites/offres-emploi/')),false);
  assertEquals(detailUrl(new URL('https://www.gouv.bj/opportunite/193/')),false);
});

Deno.test('Expat.com : seules les annonces du Bénin sont des fiches',()=>{
  assertEquals(detailUrl(new URL('https://www.expat.com/fr/immobilier/afrique/benin/42-maisons-a-vendre/816959-a-vendre-villa-7-pieces.html')),true);
  assertEquals(detailUrl(new URL('https://www.expat.com/fr/immobilier/afrique/benin/cotonou/70-immeubles-a-vendre/816518-grande-maison.html')),true);
  assertEquals(detailUrl(new URL('https://www.expat.com/fr/petites-annonces/afrique/benin/meubles/812345-tables-et-chaises.html')),true);
  assertEquals(detailUrl(new URL('https://www.expat.com/fr/immobilier/afrique/togo/42-maisons-a-vendre/811111-villa.html')),false);
  assertEquals(detailUrl(new URL('https://www.expat.com/fr/immobilier/afrique/benin/a-louer_2.html')),false);
  assertEquals(detailUrl(new URL('https://www.expat.com/fr/forum/afrique/benin/cotonou/484189-meubles-a-vendre.html')),false);
});

const listingUrl='https://www.expat.com/fr/immobilier/afrique/benin/42-maisons-a-vendre/816959-a-vendre-villa-7-pieces.html';
const realEstateHtml=`<html><head><link rel="canonical" href="${listingUrl}">
<script type="application/ld+json">${JSON.stringify({
  '@context':'https://schema.org','@type':'RealEstateListing',
  name:'A vendre, villa 7 pièces, Fidjrossè Akogbato - Cotonou',description:'Villa R+1 avec jardin.',url:listingUrl,
  about:{'@type':'Accommodation',address:{'@type':'PostalAddress',streetAddress:'Fidjrossè Akogbato'},
    image:['https://www.expat.com/upload/housing/816959/photo-1.jpg']},
  datePosted:'2026-11-22T17:03:18+01:00',
  offers:{'@type':'Offer',price:80000000,priceCurrency:'XOF',availability:'https://schema.org/InStock'},
})}</script></head><body><h1>A vendre, villa 7 pièces</h1></body></html>`;

Deno.test('Une fiche immobilière structurée devient une offre avec prix et date',()=>{
  const rows=structuredPublicListings(realEstateHtml,new URL('https://www.expat.com/'),permission);
  assertEquals(rows.length,1);
  assertEquals(rows[0].source_url,listingUrl);
  assertEquals(rows[0].evidence.published_at,'2026-11-22T16:03:18.000Z');
  const row=extractListing(realEstateHtml,new URL(listingUrl),permission);
  assertEquals(row?.source_url,listingUrl);
});

Deno.test('Une fiche immobilière sans offre chiffrée est ignorée',()=>{
  const html=realEstateHtml.replace(/"offers":\{[^}]*\}/,'"offers":{}');
  assertEquals(structuredPublicListings(html,new URL('https://www.expat.com/'),permission).length,0);
});
