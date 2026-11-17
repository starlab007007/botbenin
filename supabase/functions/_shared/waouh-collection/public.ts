import {load} from "npm:cheerio@1.2.0/slim";
import {redactPublicContacts} from "../waouh-signal-fabric.ts";
import {missionDate} from "../waouh-mission-domain.ts";
import {noticeDeadline} from "./sources.ts";
import {commercialRecord, facebookListingDetails, trustedHttps, type CollectedCommerce, type SourcePermission} from "./commerce.ts";

const object=(v:unknown):Record<string,any>=>v&&typeof v==="object"&&!Array.isArray(v)?v as Record<string,any>:{};
const array=(v:unknown):any[]=>Array.isArray(v)?v:v==null?[]:[v];
const text=(v:unknown,max=320)=>redactPublicContacts(load(String(v??"")).text()).replace(/\s+/g," ").trim().slice(0,max);
const announcement=/recrut|offre d.emploi|candidature|bourse|allocation|subvention|formation|séminaire|seminaire|appel.{0,15}projet|concours/i;

/** Deadline extraction uses closing words, never a start date or an academic year. */
export function publicDeadline(value:string):string|undefined {
  const normalized=load(value).text().replace(/\s+/g," ");
  const found:string[]=[];
  for(const m of normalized.matchAll(/(?:cl[oô]ture|date limite|dernier d[ée]lai|prendra.{0,25}fin|jusqu.au|avant le)[^.!?]{0,90}?(\d{1,2}\s+[\p{L}]+\s+\d{4})(?:\s+[àa]\s+(\d{1,2})\s*[:h]\s*(\d{2}))?/giu)) {
    const parsed=noticeDeadline(m[1]+(m[2]?` ${m[2]}:${m[3]}`:""),"+01:00");
    if(parsed)found.push(parsed);
  }
  return [...new Set(found)].sort((a,b)=>(missionDate(a)??0)-(missionDate(b)??0))[0];
}

export function qualifyPublicAnnouncement(row:CollectedCommerce, body:string, published?:string, deadline?:string, now=Date.now()) {
  const closing=deadline??publicDeadline(body);
  if(closing && ((missionDate(closing)??0)<=now))return null;
  const posted=published?Date.parse(published):NaN;
  if(Number.isFinite(posted)&&posted>now+300000)return null;
  if(!closing && (!Number.isFinite(posted)||now-posted>30*86400000))return null;
  row.evidence={...row.evidence,offer_kind:"announcement",
    ...(closing?{deadline:closing}:{deadline_status:"not_published" as const}),
    ...(Number.isFinite(posted)?{published_at:new Date(posted).toISOString()}:{}),
  };
  return row;
}

/** RSS and Atom retain the original publisher URL, date and closing conditions. */
export function rssAtomListings(xml:string, origin:URL, permission:SourcePermission, now=Date.now()) {
  const $=load(xml,{xmlMode:true});
  if(!$("rss, feed, rdf\\:RDF").length)throw new Error("source_format_changed");
  const records:CollectedCommerce[]=[];
  for(const node of $("item, entry").toArray().slice(0,60)) {
    const item=$(node),title=text(item.find("title").first().text(),280);
    if(!announcement.test(title))continue;
    const url=trustedHttps(item.find('link[rel="alternate"]').attr("href")??item.find("link").first().attr("href")??item.find("link").first().text(),origin.href);
    if(!url||url.origin!==origin.origin)continue;
    const content=item.find('content\\:encoded').text()||item.find("content").text()||item.find("description, summary").text();
    const description=text(content,700);
    const row=commercialRecord({url:url.href,title,description,category:permission.category??"Formation et bourses"},origin,permission,"announcement","ANNOUNCE");
    if(!row)continue;
    const qualified=qualifyPublicAnnouncement(row,content,
      item.find("pubDate, published, updated").first().text(),undefined,now);
    if(qualified){qualified.contacts=[{channel:"website",value:url.href}];records.push(qualified);}
  }
  return records;
}

/** Reference index only. No platform footer, profile picture or advertising text is copied. */
export function goAfricaProviders(html:string,origin:URL,permission:SourcePermission) {
  if(origin.hostname!=="www.goafricaonline.com")return [];
  const $=load(html),records:CollectedCommerce[]=[];
  for(const node of $("article h2 a[href]").toArray().slice(0,40)) {
    const link=$(node),url=trustedHttps(link.attr("href"),origin.href),card=link.closest("article");
    if(!url||url.origin!==origin.origin||!/^\/bj\/\d+-/.test(url.pathname)||card.find("h2").length!==1)continue;
    const name=text(link.text(),120),category=permission.category??"Prestataire";
    // Sponsored entries from another trade are not proof of this service.
    if(/plomb/i.test(category)&&!/plomb|sanit/i.test(url.pathname+" "+name))continue;
    if(/formation/i.test(category)&&!/formation|informatique/i.test(url.pathname+" "+name))continue;
    const city=/\b(Abomey[- ]Calavi|Porto[- ]Novo|Cotonou|Parakou|Godomey|Pahou)\b/i.exec(card.text())?.[1];
    const row=commercialRecord({url:url.href,title:`${name} · ${category}`,category,city,
      description:`${category}${city?" · "+city:""}`},origin,permission,"provider","SELL");
    if(!row)continue;
    row.actor_name=name;row.is_public_business=true;
    row.contacts=[{channel:"website",value:url.href},...card.find('a[href^="tel:"]').toArray().slice(0,3)
      .map(n=>({channel:"phone" as const,value:$(n).attr("href")!.slice(4)}))];
    records.push(row);
  }
  if(!records.length)throw new Error("source_format_changed");
  return records;
}

/** Public channel HTML only. No Telegram login, private invite or group joining. */
export function telegramPublicListings(html:string,origin:URL,permission:SourcePermission,now=Date.now()) {
  const channel=/^\/s\/([a-z0-9_]+)\/?$/i.exec(origin.pathname)?.[1];
  if(origin.hostname!=="t.me"||!channel)throw new Error("source_scope_invalid");
  const $=load(html);
  if(!$(".tgme_widget_message").length)throw new Error("source_format_changed");
  const records:CollectedCommerce[]=[];
  for(const node of $(".tgme_widget_message[data-post]").toArray().slice(-40)) {
    const item=$(node),post=item.attr("data-post");
    if(!post?.startsWith(channel+"/")||!/^\w+\/\d+$/.test(post))continue;
    const published=item.find("time[datetime]").attr("datetime"),posted=Date.parse(published??"");
    if(!Number.isFinite(posted)||posted>now+300000||now-posted>14*86400000)continue;
    const raw=load((item.find(".tgme_widget_message_text").html()??"").replace(/<br\s*\/?>/gi,"\n")).text();
    if(permission.country_scope==='BJ'&&!/b[ée]nin|Cotonou|Calavi|Parakou|Porto[- ]Novo|Godomey/i.test(raw))continue;
    const buy=/je cherche|je recherche|qui vend|cherche fournisseur|demande de (?:devis|cotation)/i.test(raw);
    const sell=/à vendre|en vente|disponible|prix\s*:|propose.{0,15}service/i.test(raw);
    const announce=announcement.test(raw)&&!buy;
    if(!announce&&buy===sell)continue;
    const details=facebookListingDetails(raw),url=`https://t.me/${post}`;
    const service=/plomb|répar|repar|nettoyage|prestation|installation|développement web/i.test(raw);
    const row=commercialRecord({url,title:details.title,description:raw,city:details.city,
      category:announce?"Emploi, formation et opportunités":details.category,price:details.price,currency:"XOF"},
      origin,permission,announce?"announcement":service?"service":"product",announce?"ANNOUNCE":buy?(service?"RFQ":"BUY"):"SELL");
    if(!row)continue;
    row.country_code=details.country_code;row.contacts=[{channel:"website",value:url}];
    row.evidence.published_at=new Date(posted).toISOString();
    const qualified=announce?qualifyPublicAnnouncement(row,raw,published,undefined,now):row;
    if(qualified)records.push(qualified);
  }
  return records;
}

/** Free JSON-LD templates handle nested ItemList and graph nodes without an LLM. */
export function structuredPublicListings(html:string,origin:URL,permission:SourcePermission,now=Date.now()) {
  const $=load(html),records:CollectedCommerce[]=[];
  const visit=(value:unknown,depth=0):void=>{
    if(depth>5)return;
    for(const candidate of array(value).slice(0,100)) {
      const item=object(candidate),types=array(item["@type"]);
      const announce=types.some(t=>["JobPosting","Course","EducationEvent"].includes(t));
      const provider=types.some(t=>["LocalBusiness","ProfessionalService"].includes(t));
      const kind=announce?"announcement":provider?"provider":types.includes("Service")?"service":types.includes("Product")?"product":null;
      const offer=object(array(item.offers)[0]);
      if(kind&&(announce||provider||Object.keys(offer).length)) {
        const address=object(object(item.jobLocation).address??item.address??object(offer.availableAtOrFrom).address);
        const row=commercialRecord({url:item.url??offer.url??item["@id"],title:item.title??item.name,
          description:text(item.description),price:offer.price,currency:offer.priceCurrency,
          city:address.addressLocality,category:item.category??(announce?"Emploi et formation":permission.category),
          brand:item.brand,model:item.model,photos:item.image},origin,permission,kind,announce?"ANNOUNCE":"SELL");
        if(row) {
          const qualified=announce?qualifyPublicAnnouncement(row,String(item.description??""),item.datePosted??item.datePublished,item.validThrough??item.endDate,now):row;
          if(qualified){qualified.is_public_business=provider;qualified.contacts=[{channel:"website",value:row.source_url}];records.push(qualified);}
        }
      }
      visit(item["@graph"],depth+1);visit(item.itemListElement,depth+1);visit(item.item,depth+1);
    }
  };
  for(const script of $('script[type="application/ld+json"]').toArray().slice(0,40)) {
    try{visit(JSON.parse($(script).text()));}catch{/* A malformed node cannot authorize another origin. */}
  }
  return [...new Map(records.map(r=>[r.source_url,r])).values()];
}
