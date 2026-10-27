const normalized=(v:unknown)=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
async function digest(text:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),v=>v.toString(16).padStart(2,'0')).join('');}
export async function automaticMissionKey(owner:string,c:{goal:string;mode:string;city?:string|null;budget?:number|null;article?:string|null;mission?:unknown}){return 'minimal-auto:'+await digest(JSON.stringify([owner,normalized(c.goal),c.mode,normalized(c.city),c.budget??null,c.article??null,...(c.mission?[c.mission]:[])]));}
/** A unique UUID insert arbitrates concurrent requests without a check-then-insert race. */
export async function automaticMandateId(owner:string,key:string,previousId:string|null){const h=await digest(JSON.stringify([owner,key,previousId??'initial']));return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-8${h.slice(17,20)}-${h.slice(20,32)}`;}
/** Fail closed if account preferences cannot be checked. No private data leaves this helper. */
export async function avatarAccountPaused(sb:any,owner:string):Promise<boolean>{const {data,error}=await sb.from('waouh_avatar_prefs').select('autonomy_settings').eq('auth_user_id',owner).maybeSingle();if(error)throw new Error('avatar_pause_check_failed');return data?.autonomy_settings?.paused===true;}
/** Recover a partially prepared mandate; concurrent retries still produce one persistent intent. */
export async function ensureAutomaticIntent(sb:any,values:Record<string,unknown>&{owner_id:string;mandate_id:string}){
 const id=await automaticMandateId(values.owner_id,'intent:'+values.mandate_id,null);
 const {data,error}=await sb.from('waouh_persistent_intents').insert({...values,id}).select('*').single();
 if(!error&&data)return data;
 if(error?.code==='23505'){
  const existing=await sb.from('waouh_persistent_intents').select('*').eq('id',id).eq('owner_id',values.owner_id).eq('mandate_id',values.mandate_id).single();
  if(!existing.error&&existing.data)return existing.data;
 }
 throw new Error('automatic_intent_prepare_failed');
}

/** Resolve the next screen without creating a mandate or granting any contact permission. */
export function automaticFollowBlock(rules:{paused:boolean;mode:string}|null,payload:{mode?:unknown;article_id?:unknown;discovery_kind?:unknown;confirmed_watch?:unknown}):'paused'|'article_required'|'approval_required'|null{
 if(rules?.paused)return 'paused';
 // Both clients already have an owned-article picker for this state.
 if(payload.mode==='sell'&&!payload.article_id)return 'article_required';
 if(rules?.mode!=='autonomous'&&!(payload.discovery_kind==='opportunity'&&payload.confirmed_watch===true))return 'approval_required';
 return null;
}
