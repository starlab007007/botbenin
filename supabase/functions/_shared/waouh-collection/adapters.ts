import {load} from 'npm:cheerio@1.2.0/slim';
import {commercialRecord,coinAfriqueCatalog,coinAfriqueDetails,facebookListingDetails,productIdentity,trustedHttps,type SourcePermission,type CollectedCommerce} from './commerce.ts';
import {structuredPublicListings,publicDeadline,qualifyPublicAnnouncement} from './public.ts';

export function detailUrl(url:URL):boolean{
 const h=url.hostname.replace(/^www\./,'');
 if(h==='e-benin.bj')return /^\/annonces\/\d+\/?$/.test(url.pathname);
 if(h==='niosso.com')return /^\/bj\/annonces\/[^/]+\/[^/]+-\d+\/?$/.test(url.pathname);
 if(h==='bj.bambaad.com'||h==='bj.coinafrique.com')return /^\/annonce\/[^/]+/.test(url.pathname);
 return /\/(?:annonce|annonces|ad|ads|listing|listings|product|produit)\/[^/]+/i.test(url.pathname);
}
export function discoverUrls(html:string,origin:URL){
 const $=load(html),details:string[]=[],indexes:string[]=[];
 for(const node of $('a[href]').toArray()){
  const a=$(node),u=trustedHttps(a.attr('href'),origin.href);
  if(!u||u.origin!==origin.origin||u.href===origin.href)continue;
  if(detailUrl(u))details.push(u.href);
  else if(a.attr('rel')?.split(' ').includes('next')||/^(?:suivant(?:e)?|next|›|»|page suivante)/i.test(a.text().trim()))indexes.push(u.href);
 }
 if(origin.hostname==='bj.bambaad.com'&&origin.pathname==='/')indexes.unshift(new URL('/annonces',origin).href);
 return {details:[...new Set(details)].slice(0,100),indexes:[...new Set(indexes)].slice(0,3)};
}
const imageValue=(el:any)=>el.attr('data-original')??el.attr('data-src')??el.attr('data-lazy')??el.attr('srcset')?.split(',').at(-1)?.trim().split(/\s+/)[0]??el.attr('src');
/** Read only the selected listing's own gallery; never related-card images or seller avatars. */
export function listingGallery(html:string,origin:URL):string[]{
 const $=load(html),primary=$('meta[property="og:image"]').toArray().map(n=>$(n).attr('content'));
 const images:string[]=[];
 const galleries=$('.product-gallery,.ad__gallery,.ad__image,[data-listing-gallery],#listing-gallery,.carousel-inner,.swiper-wrapper');
 const listingId=/-(\d+)$/.exec(origin.pathname)?.[1];
 for(const value of primary){const u=trustedHttps(value,origin.href);if(u)images.push(u.href);}
 for(const gallery of galleries.toArray()){
  const container=$(gallery);
  if(container.closest('aside,footer,[data-related],.related,.similar-products').length)continue;
  const values=container.find('img').toArray().map(n=>trustedHttps(imageValue($(n)),origin.href)).filter(Boolean) as URL[];
  const own=values.some(u=>images.some(v=>{const primary=new URL(v);return primary.origin===u.origin&&primary.pathname===u.pathname;}))||container.is('.product-gallery,.ad__gallery,.ad__image,[data-listing-gallery],#listing-gallery');
  if(!own)continue;
  images.push(...values.map(u=>u.href));
  break;
 }
 if(origin.hostname==='bj.coinafrique.com'&&listingId){
  for(const node of $('img').toArray()){
   const u=trustedHttps(imageValue($(node)),origin.href);
   if(u?.hostname==='images.coinafrique.com'&&u.pathname.startsWith('/'+listingId+'_'))images.push(u.href);
  }
 }
 return [...new Set(images)];
}

export function extractListing(html:string,origin:URL,permission:SourcePermission):CollectedCommerce|null{
 const $=load(html),canonical=trustedHttps($('link[rel="canonical"]').attr('href'),origin.href);
 if(canonical&&canonical.href!==origin.href)throw Error('listing_identity_changed');
 if(origin.hostname==='bj.coinafrique.com'){
  const title=$('h1').first().text().trim()||$('meta[property="og:title"]').attr('content')||'';
  const details=facebookListingDetails(title+' '+$('meta[property="og:description"]').attr('content'));
  const row=commercialRecord({url:origin.href,title,price:details.price,currency:'XOF',city:details.city,photos:listingGallery(html,origin)},
   new URL('/',origin),permission,'product','SELL');
  return row?coinAfriqueDetails(html,row,permission):null;
 }
 const structured=structuredPublicListings(html,new URL('/',origin),permission).find(r=>r.source_url===origin.href);
 if(structured)return structured;
 if(!detailUrl(origin))return null;
 const title=($('h1').first().text()||$('meta[property="og:title"]').attr('content')||'').replace(/\s*[|–]\s*(?:Niosso|E-Benin|Bambaad).*$/i,'').trim();
 if(title.length<5)return null;
 const description=$('[itemprop="description"],.listing-description,.ad-description,.description').first().text().trim()
  ||$('meta[property="og:description"],meta[name="description"]').first().attr('content')||'';
 const main=$('main,article').first();
 const scoped=main.length?main.clone():$('body').clone();
 scoped.find('header,footer,nav,aside,.related,.similar-products,[data-related],script,style').remove();
 const body=scoped.text().replace(/\s+/g,' ').trim();
 const facts=facebookListingDetails(title+' '+description);
 const priceText=$('[itemprop="price"],.listing-price,.ad-price,.price').first();
 const explicitPrice=priceText.attr('content')||priceText.text();
 const amount=/^\d[\d .\u00a0\u202f]*$/.test(explicitPrice.trim())?explicitPrice.trim():/(\d[\d .\u00a0\u202f]*)\s*(?:FCFA|F\s*CFA|XOF)/i.exec(explicitPrice||body)?.[1];
 const price=amount?Number(amount.replace(/[ .\u00a0\u202f]/g,'')):facts.price;
 const published=$('meta[property="article:published_time"]').attr('content')||$('time[datetime]').first().attr('datetime');
 const category=$('[itemprop="category"],.breadcrumb').last().text().trim()||permission.category||facts.category;
 const announce=/recrutement|offre d.emploi|candidature|bourse|formation|appel.{0,12}projet/i.test(title+' '+category);
 const service=/réparation|installation|nettoyage|prestation|service|plombier|mécanicien/i.test(title);
 const buy=/^(?:je )?(?:cherche|recherche|besoin de|demande de devis)/i.test(title);
 const row=commercialRecord({url:origin.href,title,description,price,currency:'XOF',category,city:facts.city??facebookListingDetails(body).city,
  photos:listingGallery(html,origin),...productIdentity(title)},new URL('/',origin),permission,
  announce?'announcement':service?'service':'product',announce?'ANNOUNCE':buy?(service?'RFQ':'BUY'):'SELL');
 if(!row)return null;
 row.contacts=[{channel:'website',value:origin.href}];
 for(const n of scoped.find('a[href^="tel:"]').toArray())row.contacts.push({channel:'phone',value:$(n).attr('href')!.slice(4)});
 if(published&&Number.isFinite(Date.parse(published)))row.evidence.published_at=new Date(published).toISOString();
 const updated=$('meta[property="article:modified_time"]').attr('content');
 if(updated&&Number.isFinite(Date.parse(updated)))row.evidence.source_updated_at=new Date(updated).toISOString();
 // A form asking whether an ad is sold is not a sold status.
 const status=$('[itemprop="availability"],.listing-status,[data-listing-status]').first();
 if(/^(?:vendu|loué|pourvu|sold|closed|indisponible)$/i.test(status.text().trim())||/SoldOut|OutOfStock/.test(status.attr('href')??''))throw Error('listing_closed');
 return announce?qualifyPublicAnnouncement(row,body,published,publicDeadline(body)):row;
}

export function indexRows(html:string,origin:URL,permission:SourcePermission){
 return permission.collection_format==='coinafrique'?coinAfriqueCatalog(html,origin,permission):structuredPublicListings(html,origin,permission);
}
