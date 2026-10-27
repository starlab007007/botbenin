import type {MissionKind,MissionContext} from '../../../supabase/functions/_shared/waouh-mission-domain';
import {autonomyWindowOpen,normalizeAvatarAutonomy} from '../../../supabase/functions/_shared/waouh-avatar-autonomy-settings';
import { invokeWaouhAgentic } from './agenticClient';
import type { NexusAvatarMandate } from './nexus';
export type AutomaticSearch={goal:string;city?:string;budget_max?:number;mode:'buy'|'sell'|'ask';article_id?:string;comparison_priority?:'price'|'availability';discovery_kind?:MissionKind;mission_context?:MissionContext;confirmed_watch?:boolean};
export type AutomaticMission={mandate:NexusAvatarMandate|null;skipped?:'paused'|'approval_required'|'article_required'};
const pending=new Map<string,Promise<AutomaticMission>>();
/** Coalesce concurrent mounts; the server additionally deduplicates across devices. */
export function followAutomaticSearch(owner:string,input:AutomaticSearch):Promise<AutomaticMission>{
 const key=JSON.stringify([owner,input]);const previous=pending.get(key);if(previous)return previous;
 const operation=invokeWaouhAgentic<AutomaticMission>('nexus.mandate.create',{...input,automatic_follow:true,origin_surface:'web_minimal_search'},{expectedOwner:owner});
 pending.set(key,operation);void operation.finally(()=>{if(pending.get(key)===operation)pending.delete(key);}).catch(()=>{});return operation;
}

export function automaticMissionMessage(m:NexusAvatarMandate){if(m.status==='paused')return 'Le suivi de cette mission est en pause.';if(!autonomyWindowOpen(m))return 'Bot reprendra à l’ouverture.';if(m.metadata?.discovery_kind==='opportunity')return 'Votre avatar surveille les publications et les échéances. Toute candidature reste à valider.';if(m.metadata?.autonomy_settings&&!normalizeAvatarAutonomy(m.metadata.autonomy_settings).allow_contact)return 'Bot compare. Les contacts attendent votre accord.';return 'Bot poursuit la mission selon vos règles.';}
