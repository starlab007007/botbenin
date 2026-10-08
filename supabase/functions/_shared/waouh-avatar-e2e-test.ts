import { strict as assert } from 'node:assert';
import { diversifyAvatarResults } from './waouh-avatar-discovery.ts';
import { claimAvatarContact } from './waouh-avatar-contact.ts';
Deno.test('Discovery diversifies sources without inventing results or repeating a person', () => {
 const rows = [{id:1,entity_id:'a',source_key:'x'},{id:2,entity_id:'a',source_key:'z'},{id:3,entity_id:'b',source_key:'x'},{id:4,entity_id:'c',source_key:'x'},{id:5,entity_id:'d',source_key:'y'}];
 const picked = diversifyAvatarResults(rows,3);
 assert.deepEqual(picked.map(r=>r.id),[1,3,5]);
 assert.equal(diversifyAvatarResults(rows,10).length,4);
});
Deno.test('No source is discarded when it is the only relevant source', () => {
 const rows = [1,2,3,4].map(id=>({id,source_key:'x'}));
 assert.deepEqual(diversifyAvatarResults(rows,4),rows);
});
Deno.test('Contact claims are owner and journey scoped and fail closed', async () => {
 let args:any;
 const sb={rpc:async(name:string,params:any)=>{assert.equal(name,'waouh_avatar_claim_contact');args=params;return {data:false,error:null};}};
 assert.equal(await claimAvatarContact(sb,{owner_id:'owner'},{id:'journey'},'phone:hash'),false);
 assert.deepEqual(args,{p_owner_id:'owner',p_journey_id:'journey',p_endpoint:'phone:hash'});
 await assert.rejects(()=>claimAvatarContact({rpc:async()=>({error:new Error('database unavailable')})},{},{},'phone:hash'));
});
