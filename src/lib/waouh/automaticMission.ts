import { invokeWaouhAgentic } from './agenticClient';
import type { NexusAvatarMandate } from './nexus';
export type AutomaticSearch={goal:string;city?:string;budget_max?:number;mode:'buy'|'sell'|'ask';article_id?:string;comparison_priority?:'price'|'availability'};
export type AutomaticMission={mandate:NexusAvatarMandate|null;skipped?:'paused'|'approval_required'|'article_required'};
const pending=new Map<string,Promise<AutomaticMission>>();
/** Coalesce concurrent mounts; the server additionally deduplicates across devices. */
export function followAutomaticSearch(owner:string,input:AutomaticSearch):Promise<AutomaticMission>{
 const key=JSON.stringify([owner,input]);const previous=pending.get(key);if(previous)return previous;
 const operation=invokeWaouhAgentic<AutomaticMission>('nexus.mandate.create',{...input,automatic_follow:true,origin_surface:'web_minimal_search'});
 pending.set(key,operation);void operation.finally(()=>{if(pending.get(key)===operation)pending.delete(key);}).catch(()=>{});return operation;
}
