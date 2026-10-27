import {missionDate} from './waouh-mission-domain.ts';
import { redactPublicContacts, safeSourceUrl } from "./waouh-signal-fabric.ts";
/** Public browsing only: no contact, mission, provider refresh or personal history. */
export const isPublicNexusRead = (action: string) => ["nexus.global_discovery", "nexus.sources"].includes(action);
export const PUBLIC_NEXUS_SOURCES = ["waouh_app", "partner", "google_places", "serpapi", "apify", "benin_directory", "facebook_business", "instagram_business", "telegram_public"];
function publicPhoto(value:unknown){
 if(typeof value!=='string')return null;
 try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||/(^|\.)localhost$|\.local$/.test(u.hostname)||/^\d{1,3}(?:\.\d{1,3}){3}$|[:\[\]]/.test(u.hostname)||u.pathname.includes('/object/sign/')||[...u.searchParams.keys()].some(k=>/token|signature|credential|authorization|api.?key|x-amz|secret|session|jwt/i.test(k)))return null;return u.href;}catch{return null;}
}
/** Keep only declared public business facts; never copy contact packs or raw evidence. */
export function publicBusinessEvidence(value:unknown){
 const e=value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
 const result:Record<string,unknown>={};
 for(const key of ['unit','price_unit','price_basis','scope','deliverables','perimetre','service_scope','conditions','eligibility_conditions','exclusions','warranty','guarantee','condition','offer_kind','kind','time_slot','organization','organizer']){
  const v=e[key];if(typeof v==='string')result[key]=redactPublicContacts(v).slice(0,1500);else if(Array.isArray(v))result[key]=v.filter(x=>typeof x==='string').slice(0,8).map(x=>redactPublicContacts(x)).join(' · ').slice(0,1500);
 }
 for(const key of ['deadline','closing_date','expires_at','available_at'])if(missionDate(e[key])!==null)result[key]=e[key];
 for(const key of ['delivery_days','duration_days','pages','page_count','visit_fee','callout_fee','diagnostic_fee','delivery_fee','delivery_cost','revisions','revision_count','minimum_quantity','min_quantity','quantity','requested_quantity'])if(typeof e[key]==='number'&&Number.isFinite(e[key])&&Number(e[key])>=0)result[key]=e[key];
 for(const key of ['diagnostic_included','delivery_included','price_confirmed','availability_confirmed','in_stock','remote','eligible'])if(typeof e[key]==='boolean')result[key]=e[key];
 if(['available','unavailable'].includes(String(e.availability)))result.availability=e.availability;
 const photos=[e.primary_photo_url,e.image_url,...(Array.isArray(e.photos)?e.photos:[])].map(publicPhoto).filter(Boolean).slice(0,6);
 if(photos.length)result.photos=[...new Set(photos)];
 return result;
}
export function publicNexusResult(row: Record<string, unknown>) {
  const sourceUrl = safeSourceUrl(row.source_url);
  const url = sourceUrl ? new URL(sourceUrl) : null;
  if (url) { url.search = ""; url.hash = ""; }
  return {
    fabric_id: row.fabric_id, source_key: row.source_key, source_url: url && !url.username && !url.password ? url.toString() : null,
    subject: redactPublicContacts(row.subject), category: row.category, intent: row.intent,
    price_min: row.price_min, price_max: row.price_max, currency:row.currency, city: row.city, observed_at: row.observed_at,
    condition:typeof row.condition==='string'?redactPublicContacts(row.condition).slice(0,80):null,evidence:publicBusinessEvidence({...((row.evidence&&typeof row.evidence==='object')?row.evidence as Record<string,unknown>:{}),...(row.expires_at?{expires_at:row.expires_at}:{})}),
    scores: row.scores ? { ...(row.scores as Record<string, unknown>), contactability_score: 0, reasons: ((row.scores as { reasons?: string[] }).reasons ?? []).filter(reason => reason !== "Contact autorisé") } : undefined,
    contact_policy: { level: "C0", label: "Connexion requise pour préparer le contact", can_reveal: false, can_auto_contact: false, can_blind_message: false, can_user_confirm_contact: false, requires_approval: true },
  };
}
