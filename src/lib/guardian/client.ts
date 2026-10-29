import {supabase} from '@/integrations/supabase/client';
let lastSent=0;
export async function reportGuardian(code:'render_error'|'unhandled_error'|'sale_error'|'users_error'):Promise<void>{
 if(Date.now()-lastSent<60000)return;lastSent=Date.now();
 try{const{data}=await supabase.auth.getSession();if(!data.session?.access_token)return;
 await supabase.functions.invoke('waouh-health-check',{body:{action:'guardian.event',platform:'web',code,surface:'other'},signal:AbortSignal.timeout(4000)});
 }catch{/* No stack, message, user content, retry loop or recursive report. */}
}
