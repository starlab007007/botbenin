import {invokeWaouhAgentic} from './agenticClient';
import {normalizeSaleDraft,type SaleDraft,type SaleSuggestions} from '../../../supabase/functions/_shared/waouh-smart-sale';
export {SALE_CONDITIONS,normalizeSaleDraft,mergeSaleSuggestions,saleTextSuggestions,salePlace} from '../../../supabase/functions/_shared/waouh-smart-sale';
export type {SaleDraft,SaleSuggestions};
export type PublishedSale={draft:SaleDraft;article:Record<string,any>&{id:string;title:string;photos:string[];price:number;article_id:string}};
export const saleRequestId=()=>globalThis.crypto.randomUUID();
export function newSaleDraft(value:Record<string,unknown>={}):SaleDraft{return {...normalizeSaleDraft(value),request_id:typeof value.request_id==='string'?value.request_id:saleRequestId()};}
export function analyzeSale(owner:string,draft:SaleDraft,visual:boolean){return invokeWaouhAgentic<{suggestions:SaleSuggestions}>('nexus.sale.analyze',{...draft,visual},{expectedOwner:owner});}
export async function publishSale(owner:string,draft:SaleDraft):Promise<PublishedSale>{
 const {article}=await invokeWaouhAgentic<{article:PublishedSale['article']}>('nexus.sale.publish',{...draft,confirmed:true},{expectedOwner:owner});
 return {draft:{...draft,article_id:article.article_id},article};
}
const prefix='waouh:sale-handoff:';
export function saleSearchPath(owner:string,sale:PublishedSale){
 const id=saleRequestId();
 try{sessionStorage.setItem(prefix+id,JSON.stringify({owner,expires:Date.now()+3600000,sale}));}catch{/* Article remains saved and can be recovered from the owned listing. */}
 return '/app/nexus?'+new URLSearchParams({kind:'vendre',mode:'find_buyers',q:sale.article.title,city:sale.draft.city,article_id:sale.article.article_id,sale_draft:id,go:'1'});
}
export function saleHandoff(id:string|null,owner?:string|null):PublishedSale|null{
 if(!id||!owner)return null;
 try{const r=JSON.parse(sessionStorage.getItem(prefix+id)||'null');if(r?.owner!==owner||r.expires<Date.now())return null;return r.sale?.article?.article_id?r.sale:null;}catch{return null;}
}
