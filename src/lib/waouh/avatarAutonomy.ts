import { supabase } from '@/integrations/supabase/client';
export { DEFAULT_AVATAR_AUTONOMY,normalizeAvatarAutonomy,avatarAutonomyError } from '../../../supabase/functions/_shared/waouh-avatar-autonomy-settings';
export type { AvatarAutonomySettings } from '../../../supabase/functions/_shared/waouh-avatar-autonomy-settings';
import { normalizeAvatarAutonomy,type AvatarAutonomySettings } from '../../../supabase/functions/_shared/waouh-avatar-autonomy-settings';
export async function loadAvatarAutonomy():Promise<AvatarAutonomySettings>{
  const {data,error}=await supabase.functions.invoke('waouh-avatar-briefing',{body:{action:'get_prefs'}});
  if(error||!data?.ok)throw new Error('Chargement des règles impossible. Réessayez.');
  return normalizeAvatarAutonomy(data.prefs?.autonomy_settings);
}
export async function saveAvatarAutonomy(settings:AvatarAutonomySettings,expectedOwner?:string):Promise<AvatarAutonomySettings>{
  const {data:sessionData}=await supabase.auth.getSession();const session=sessionData.session;
  if(!session||(expectedOwner&&session.user.id!==expectedOwner))throw new Error('Votre compte a changé. Relancez l’action.');
  const {data,error}=await supabase.functions.invoke('waouh-avatar-briefing',{headers:{Authorization:`Bearer ${session.access_token}`},body:{action:'set_prefs',prefs:{autonomy_settings:settings}}});
  if(error||!data?.ok||!data.prefs?.autonomy_settings)throw new Error('Enregistrement impossible. Réessayez.');
  return normalizeAvatarAutonomy(data.prefs.autonomy_settings);
}
