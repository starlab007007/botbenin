import {createClient} from 'npm:@supabase/supabase-js@2';
import {moduleRequestGate} from '../_shared/waouh-module-request.ts';
import {requireRuntimeOrAdmin} from '../_shared/waouh-runtime-auth.ts';
import {waouhCorsHeaders} from '../_shared/waouh-auth.ts';
import {runCollectionTick} from '../_shared/waouh-collection/worker.ts';
// The historical endpoint now uses the common queue, atomic quotas and publisher verification.
Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:waouhCorsHeaders});
 if(req.method!=='POST')return Response.json({ok:false},{status:405,headers:waouhCorsHeaders});
 const gate=await moduleRequestGate(req,['nexus'],true);if(gate)return gate;
 const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
 const guard=await requireRuntimeOrAdmin(req,db);if(!guard.ok)return guard.response;
 try{return Response.json({ok:true,...await runCollectionTick(db,['web'])},{headers:waouhCorsHeaders});}
 catch{return Response.json({ok:false,code:'collection_tick_failed'},{status:503,headers:waouhCorsHeaders});}
});
