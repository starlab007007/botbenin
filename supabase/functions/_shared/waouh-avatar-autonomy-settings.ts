/** Account defaults are snapshotted into each explicitly created mandate. */
export interface AvatarAutonomySettings {
  mode: 'assisted'|'semi_autonomous'|'autonomous'; goal:string; city:string;
  budget_max:number|null; price_floor:number|null; radius_km:number;
  active_start:string; active_end:string; start:'now'|'tomorrow'; duration_hours:number;
  scan_interval_minutes:number; followup_hours:number; max_followups:number; max_contacts:number;
  allow_contact:boolean; allow_negotiate:boolean; allow_whatsapp:boolean;
  notify_reply:boolean; notify_offer:boolean; digest_only:boolean;
  no_match:'ask'|'stop'; agreement:'confirm';
}
export const DEFAULT_AVATAR_AUTONOMY:AvatarAutonomySettings={mode:'autonomous',goal:'',city:'',budget_max:null,price_floor:null,radius_km:25,active_start:'08:00',active_end:'20:00',start:'now',duration_hours:24,scan_interval_minutes:30,followup_hours:24,max_followups:1,max_contacts:5,allow_contact:false,allow_negotiate:false,allow_whatsapp:false,notify_reply:true,notify_offer:true,digest_only:false,no_match:'ask',agreement:'confirm'};
const member=<T>(value:unknown,values:readonly T[],fallback:T):T=>values.includes(value as T)?value as T:fallback;
const text=(v:unknown,max:number)=>typeof v==='string'?v.trim().slice(0,max):'';
const amount=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>0&&v<=1e9?v:null;
export function normalizeAvatarAutonomy(raw:unknown):AvatarAutonomySettings {
  const r=(raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{}) as Record<string,unknown>;
  const d=DEFAULT_AVATAR_AUTONOMY;
  const time=(v:unknown,fallback:string)=>typeof v==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(v)?v:fallback;
  return {mode:member(r.mode,['assisted','semi_autonomous','autonomous'] as const,d.mode),goal:text(r.goal,1000),city:text(r.city,120),budget_max:amount(r.budget_max),price_floor:amount(r.price_floor),radius_km:member(r.radius_km,[0,10,25,50],d.radius_km),active_start:time(r.active_start,d.active_start),active_end:time(r.active_end,d.active_end),start:member(r.start,['now','tomorrow'] as const,d.start),duration_hours:member(r.duration_hours,[24,48,168],d.duration_hours),scan_interval_minutes:member(r.scan_interval_minutes,[30,60,360],d.scan_interval_minutes),followup_hours:member(r.followup_hours,[6,24],d.followup_hours),max_followups:member(r.max_followups,[0,1,2],d.max_followups),max_contacts:member(r.max_contacts,[3,5,10],d.max_contacts),allow_contact:r.allow_contact===true,allow_negotiate:r.allow_negotiate===true,allow_whatsapp:r.allow_whatsapp===true,notify_reply:r.notify_reply!==false,notify_offer:r.notify_offer!==false,digest_only:r.digest_only===true,no_match:member(r.no_match,['ask','stop'] as const,d.no_match),agreement:'confirm'};
}
export function avatarAutonomyError(r:AvatarAutonomySettings):string|null {
  if(r.active_start>=r.active_end)return 'Choisissez une heure de fin après l’heure de début.';
  if(r.allow_negotiate&&!r.allow_contact)return 'Autorisez le contact pour permettre la négociation.';
  return null;
}
export function autonomyStartsAt(r:AvatarAutonomySettings,now=new Date()):Date {
  if(r.start==='now')return now;
  const local=new Date(now.getTime()+3600000);
  const [h,m]=r.active_start.split(':').map(Number);
  return new Date(Date.UTC(local.getUTCFullYear(),local.getUTCMonth(),local.getUTCDate()+1,h-1,m));
}
export function autonomyWindowOpen(mandate:{metadata?:Record<string,unknown>},now=new Date()):boolean {
  const stored=mandate.metadata?.autonomy_settings;
  if(!stored)return true; // Existing mandates retain their previous explicit contract.
  const r=normalizeAvatarAutonomy(stored);
  const starts=mandate.metadata?.starts_at;
  if(typeof starts==='string'&&Date.parse(starts)>now.getTime())return false;
  const local=new Date(now.getTime()+3600000),clock=local.toISOString().slice(11,16);
  return clock>=r.active_start&&clock<r.active_end;
}
export function autonomyContactAllowed(mandate:{autonomy_mode?:string;metadata?:Record<string,unknown>},now=new Date()):boolean {
  if(!mandate.metadata?.autonomy_settings)return true;
  const r=normalizeAvatarAutonomy(mandate.metadata.autonomy_settings);
  return r.allow_contact&&r.mode!=='assisted'&&autonomyWindowOpen(mandate,now);
}
/** A queued action is rechecked before sending, without consuming a retry. */
export function autonomyNextWindow(mandate:{metadata?:Record<string,unknown>},now=new Date()):Date {
  if(!mandate.metadata?.autonomy_settings)return now;
  const rules=normalizeAvatarAutonomy(mandate.metadata.autonomy_settings);
  const start=typeof mandate.metadata.starts_at==='string'?Date.parse(mandate.metadata.starts_at):NaN;
  const at=new Date(Number.isFinite(start)?Math.max(now.getTime(),start):now.getTime());
  const local=new Date(at.getTime()+3600000),clock=local.toISOString().slice(11,16);
  if(clock>=rules.active_start&&clock<rules.active_end)return at;
  const [hour,minute]=rules.active_start.split(':').map(Number);
  return new Date(Date.UTC(local.getUTCFullYear(),local.getUTCMonth(),local.getUTCDate()+(clock>=rules.active_end?1:0),hour-1,minute));
}
