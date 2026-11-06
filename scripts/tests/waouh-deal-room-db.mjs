import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function public.is_admin(uuid) returns boolean language sql as $$select false$$;
create function public.waouh_module_policy(uuid) returns table(module_key text,visible boolean,access_enabled boolean,automation_enabled boolean) language sql as $$select k,true,true,true from unnest(array['nexus','missions','avatar']) k$$;
create table public.waouh_users(id uuid primary key,auth_user_id uuid);create table public.waouh_avatar_prefs(auth_user_id uuid,autonomy_settings jsonb);create table public.waouh_articles(id uuid primary key,seller_id uuid,status text);
create table public.waouh_notifications(user_id uuid,notification_type text,article_id uuid,photos text[],payload jsonb,channel text,delivery_status text,dedupe_key text unique);`);
for(const f of ['20261024095753_waouh_convergence.sql','20261024103115_waouh_convergence_group_quote_guard.sql','20261029214830_waouh_business_journey.sql','20261030075851_waouh_atomic_interest.sql','20261104082300_waouh_unified_deal_rooms.sql','20261104105439_waouh_room_followup_resume_cooldown.sql','20261104111700_waouh_room_progressive_guidance.sql','20261106130900_waouh_receipt_mutual_proof.sql','20261106190000_waouh_room_guidance_restore_and_agreement_lock.sql','20261106200000_waouh_opportunity_outcome.sql'])await db.exec(await readFile(new URL('../../supabase/migrations/'+f,import.meta.url),'utf8'));
const owner='00000000-0000-4000-8000-000000000001',seller='00000000-0000-4000-8000-000000000002',other='00000000-0000-4000-8000-000000000003',article='00000000-0000-4000-8000-000000000004';
for(const id of [owner,seller,other])await db.query('insert into auth.users values($1)',[id]);
await db.query('insert into public.waouh_users values($1,$1)',[seller]);await db.query("insert into public.waouh_articles values($1,$2,'active')",[article,seller]);
const cmd=async(actor,action,p={})=>(await db.query('select public.waouh_room_command($1,$2,$3) d',[actor,action,['get','list','events'].includes(action)?p:{request_id:crypto.randomUUID(),...p}])).rows[0].d;
const source={title:'Téléphone',source_ref:'article:'+article,kind:'product',amount:150000,source_snapshot:{product:{title:'Téléphone',photos:[]}}};
let r=await cmd(owner,'open',{source,city:'Cotonou',confirmed:true});const id=r.deal_room_id;
assert.equal(r.provider_joined,true);assert.equal(r.messages.length,1);
assert.equal(Number((await db.query('select count(*) n from public.waouh_notifications')).rows[0].n),1);
assert.equal((await cmd(owner,'open',{source,city:'Cotonou',confirmed:true})).deal_room_id,id);
assert.equal((await cmd(owner,'get',{deal_room_id:id})).messages.length,1);
await assert.rejects(cmd(other,'get',{deal_room_id:id}),/forbidden/);
await assert.rejects(cmd(seller,'delegate',{deal_room_id:id,mandate_revision:0,confirmed:true,rules:{}}),/owner_required/);
const rules={mode:'autonomous',budget_max:145000,initial_offer:140000,duration_hours:72,max_followups:1,active_start:'00:00',active_end:'23:59'};
await assert.rejects(cmd(owner,'delegate',{deal_room_id:id,mandate_revision:0,confirmed:true,rules:{...rules,initial_offer:150000}}),/outside_budget/);
r=await cmd(owner,'delegate',{deal_room_id:id,mandate_revision:0,confirmed:true,rules});assert.equal(r.control_mode,'bot');
await db.query('select public.waouh_room_tick(20)');
r=await cmd(owner,'get',{deal_room_id:id});assert.equal(r.messages.filter(m=>m.author_kind==='bot').length,1);assert.match(r.messages.at(-1).text,/140000/);
await db.query('select public.waouh_room_tick(20)');assert.equal((await cmd(owner,'get',{deal_room_id:id})).messages.length,r.messages.length);
await assert.rejects(cmd(owner,'message',{deal_room_id:id,text:'Concurrent'}),/takeover_required/);
const terms={amount:150000,quantity:1,scope:'Un téléphone',deadline:'Demain',exclusions:'Livraison exclue',expected_result:'Téléphone testé',payment:'À la remise'};
r=await cmd(seller,'propose',{deal_room_id:id,version:0,terms});
await db.query('select public.waouh_room_tick(20)');r=await cmd(owner,'get',{deal_room_id:id});assert.equal(r.agreement.terms.amount,145000);assert.equal(r.agreement.owner_accepted_at,null);assert.equal(r.agreement.provider_accepted_at,null);assert.ok(r.messages.filter(m=>m.author_kind==='bot').every(m=>!m.text.includes('plafond')));
await assert.rejects(cmd(owner,'accept',{deal_room_id:id,version:1}),/changed/);
const rev=r.mandate_revision;r=await cmd(owner,'takeover',{deal_room_id:id,mandate_revision:rev});assert.equal(r.control_mode,'manual');
await assert.rejects(cmd(owner,'resume_bot',{deal_room_id:id,mandate_revision:rev,confirmed:true}),/revision_changed/);
const request_id=crypto.randomUUID(),payload={deal_room_id:id,text:'Bonjour',request_id};
await cmd(owner,'message',payload);assert.equal((await cmd(owner,'message',payload)).replayed,true);
await assert.rejects(cmd(owner,'message',{...payload,text:'Autre contenu'}),/scope_changed/);
const version=r.agreement.version;await cmd(owner,'accept',{deal_room_id:id,version});r=await cmd(seller,'accept',{deal_room_id:id,version});assert.equal(r.agreement.status,'accepted');assert.equal(r.control_mode,'manual');
assert.equal(r.mandate,null,'Seller cannot see buyer ceiling');
await assert.rejects(cmd(owner,'delegate',{deal_room_id:id,mandate_revision:r.mandate_revision,confirmed:true,rules}),/already_confirmed/);

// Assisted steps are one-shot approvals scoped to both the mandate and current offer.
const article2='00000000-0000-4000-8000-000000000005';
await db.query("insert into public.waouh_articles values($1,$2,'active')",[article2,seller]);
let assisted=await cmd(owner,'open',{source:{...source,source_ref:'article:'+article2},city:'Cotonou',confirmed:true});const aid=assisted.deal_room_id;
assisted=await cmd(owner,'delegate',{deal_room_id:aid,mandate_revision:0,confirmed:true,rules:{...rules,mode:'assisted',one_step_approved:true}});
await db.query('select public.waouh_room_tick(20)');assert.equal((await cmd(owner,'get',{deal_room_id:aid})).messages.filter(m=>m.author_kind==='bot').length,0);
await cmd(owner,'approve_step',{deal_room_id:aid,mandate_revision:assisted.mandate_revision,version:0});await db.query('select public.waouh_room_tick(20)');
assert.equal((await cmd(owner,'get',{deal_room_id:aid})).messages.filter(m=>m.author_kind==='bot').length,1);
await db.query("update public.waouh_deal_room_links set next_run_at=now() where id=$1",[aid]);await db.query('select public.waouh_room_tick(20)');
assert.equal((await cmd(owner,'get',{deal_room_id:aid})).messages.filter(m=>m.author_kind==='bot').length,1);
// Pause/resume cannot send a reminder before the original 24-hour deadline.
let resumed=await cmd(owner,'get',{deal_room_id:aid});
resumed=await cmd(owner,'delegate',{deal_room_id:aid,mandate_revision:resumed.mandate_revision,confirmed:true,rules});
resumed=await cmd(owner,'pause',{deal_room_id:aid,mandate_revision:resumed.mandate_revision});
resumed=await cmd(owner,'resume_bot',{deal_room_id:aid,mandate_revision:resumed.mandate_revision,confirmed:true});
assert.equal((await db.query('select public.waouh_room_tick(1,$1) n',[aid])).rows[0].n,0);
assert.equal((await cmd(owner,'get',{deal_room_id:aid})).messages.filter(m=>m.author_kind==='bot').length,1);
assert.equal((await db.query("select l.next_run_at=(select max(created_at)+interval '24 hours' from public.waouh_room_events where room_id=l.id and actor_kind='bot') ok from public.waouh_deal_room_links l where id=$1",[aid])).rows[0].ok,true);
await db.query("update public.waouh_room_events set created_at=now()-interval '25 hours' where room_id=$1 and actor_kind='bot'",[aid]);
await db.query("update public.waouh_deal_room_links set next_run_at=now() where id=$1",[aid]);
assert.equal((await db.query('select public.waouh_room_tick(1,$1) n',[aid])).rows[0].n,1);
await db.query("update public.waouh_deal_room_links set next_run_at=now() where id=$1",[aid]);
assert.equal((await db.query('select public.waouh_room_tick(1,$1) n',[aid])).rows[0].n,0);
const historyBase=(await cmd(owner,'get',{deal_room_id:aid})).messages.length;
// History remains pageable after more than a hundred messages.
for(let i=0;i<105;i++)await db.query("insert into public.waouh_business_messages(component_id,actor_id,request_id,text,created_at) values($1,$2,$3,$4,now()-interval '1 day'+($5::int*interval '1 second'))",[aid,owner,crypto.randomUUID(),'History '+i,i]);
const latest=await cmd(owner,'get',{deal_room_id:aid});assert.equal(latest.messages.length,100);assert.ok(latest.message_cursor);
const older=await cmd(owner,'get',{deal_room_id:aid,before_message:latest.message_cursor});assert.ok(older.messages.length>0);assert.equal(new Set([...older.messages,...latest.messages].map(x=>x.id)).size,historyBase+105);
// An expired mandate cannot resume or send.
await db.query("update public.waouh_deal_room_links set expires_at=now()-interval '1 minute',next_run_at=now() where id=$1",[aid]);await db.query('select public.waouh_room_tick(20)');
assisted=await cmd(owner,'get',{deal_room_id:aid});assert.equal(assisted.control_mode,'paused');await assert.rejects(cmd(owner,'resume_bot',{deal_room_id:aid,mandate_revision:assisted.mandate_revision,confirmed:true}),/expired/);
// An external invitation joins the same room, without claiming delivery.
let external=await cmd(owner,'open',{source:{...source,source_ref:'external:private'},city:'Cotonou',confirmed:true});assert.equal(external.provider_joined,false);
const invited=await cmd(owner,'invite',{deal_room_id:external.deal_room_id});assert.ok(invited.token);
await db.query("select public.waouh_convergence_command($1,'redeem_invite',$2)",[seller,{token:invited.token}]);
const adopted=await cmd(seller,'adopt',{component_id:external.deal_room_id});assert.equal(adopted.deal_room_id,external.deal_room_id);assert.equal(adopted.provider_joined,true);
for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(cmd(owner,'get',{deal_room_id:id}),/permission denied/);await db.exec('reset role');}
console.log('Unified Deal Room: same room, authorization, mandate bounds, no double send, takeover, stale versions, privacy and bilateral agreement passed.');

// Fulfilment is a separate, bilateral step after the exact agreement is accepted.
let closing=await cmd(owner,'get',{deal_room_id:id});
await assert.rejects(cmd(owner,'complete',{deal_room_id:id,version:closing.agreement.version}),/evidence/);
await cmd(owner,'receipt',{deal_room_id:id,version:closing.agreement.version});
await cmd(owner,'payment_report',{deal_room_id:id,version:closing.agreement.version});
await cmd(seller,'payment_receive',{deal_room_id:id,version:closing.agreement.version});
await cmd(owner,'complete',{deal_room_id:id,version:closing.agreement.version});
closing=await cmd(seller,'complete',{deal_room_id:id,version:closing.agreement.version});
assert.equal(closing.agreement.status,'completed');
assert.ok(closing.allowed_actions.includes('rating'));
closing=await cmd(owner,'rating',{deal_room_id:id,rating:5});
assert.equal(closing.evidence.owner_rating,5);
console.log('Receipt, payment declarations, bilateral closure and rating passed.');

const opportunity=await cmd(owner,'open',{source:{...source,kind:'announcement',source_ref:'external:opportunity'},city:'Cotonou',confirmed:true});
assert.ok(opportunity.allowed_actions.includes('application_prepare'));
await assert.rejects(cmd(owner,'application_submit',{deal_room_id:opportunity.deal_room_id,confirmation:'submitted'}),/confirmation/);
await cmd(owner,'application_prepare',{deal_room_id:opportunity.deal_room_id});
const applied=await cmd(owner,'application_submit',{deal_room_id:opportunity.deal_room_id,confirmation:'submitted'});
assert.ok(applied.evidence.application_submitted_at);
assert.equal(applied.agreement,null);
console.log('Opportunity application keeps its own process without a fabricated purchase agreement.');
// Opportunité conclue : l'annonceur répond au dossier transmis.
const offerArticle='00000000-0000-4000-8000-000000000007';
await db.query("insert into public.waouh_articles values($1,$2,'active')",[offerArticle,seller]);
await db.query('insert into public.waouh_users values($1,$2)',['00000000-0000-4000-8000-000000000008',owner]);
let job=await cmd(owner,'open',{source:{...source,kind:'announcement',source_ref:'article:'+offerArticle},city:'Cotonou',confirmed:true});
const jobId=job.deal_room_id;assert.equal(job.provider_joined,true);
assert.equal((await cmd(seller,'get',{deal_room_id:jobId})).guidance.title,'Dossier en préparation');
await assert.rejects(cmd(seller,'application_outcome',{deal_room_id:jobId,outcome:'retained'}),/not_submitted/);
await cmd(owner,'application_prepare',{deal_room_id:jobId});
job=await cmd(owner,'application_submit',{deal_room_id:jobId,confirmation:'submitted'});
assert.ok(!job.allowed_actions.includes('application_prepare')&&!job.allowed_actions.includes('application_outcome'));
let publisher=await cmd(seller,'get',{deal_room_id:jobId});
assert.ok(publisher.allowed_actions.includes('application_outcome'));assert.equal(publisher.guidance.action,'application_outcome');
await assert.rejects(cmd(owner,'application_outcome',{deal_room_id:jobId,outcome:'retained'}),/forbidden/);
await assert.rejects(cmd(seller,'application_outcome',{deal_room_id:jobId,outcome:'maybe'}),/invalid_outcome/);
publisher=await cmd(seller,'application_outcome',{deal_room_id:jobId,outcome:'retained',text:'Profil retenu, entretien lundi'});
assert.equal(publisher.evidence.application_outcome,'retained');assert.equal(publisher.guidance.status,'completed');
assert.ok(!publisher.allowed_actions.includes('application_outcome'));
job=await cmd(owner,'get',{deal_room_id:jobId});
assert.equal(job.guidance.title,'Candidature retenue');assert.equal(job.guidance.status,'completed');assert.equal(job.evidence.application_outcome_note,'Profil retenu, entretien lundi');
assert.ok(job.guidance.steps.every(step=>step.state==='complete'));
await assert.rejects(cmd(seller,'application_outcome',{deal_room_id:jobId,outcome:'declined'}),/recorded/);
assert.equal(Number((await db.query("select count(*) n from public.waouh_notifications where dedupe_key='application-outcome:'||$1",[jobId])).rows[0].n),1);
console.log('Opportunity concluded: publisher answers the transmitted application once, candidate is notified.');
// Administrative automation controls also stop the independent server worker.
const policyArticle='00000000-0000-4000-8000-000000000006';
await db.query("insert into public.waouh_articles values($1,$2,'active')",[policyArticle,seller]);
let gated=await cmd(owner,'open',{source:{...source,source_ref:'article:'+policyArticle},city:'Cotonou',confirmed:true});
gated=await cmd(owner,'delegate',{deal_room_id:gated.deal_room_id,mandate_revision:0,confirmed:true,rules});
await db.exec("create or replace function public.waouh_module_policy(uuid) returns table(module_key text,visible boolean,access_enabled boolean,automation_enabled boolean) language sql as $$select k,true,true,false from unnest(array['nexus','missions','avatar']) k$$;");
await db.query('select public.waouh_room_tick(20)');
assert.equal((await cmd(owner,'get',{deal_room_id:gated.deal_room_id})).messages.filter(m=>m.author_kind==='bot').length,0);
console.log('Administrative automation switches stop the room worker.');
const guidancePath=new URL('../../tests/fixtures/waouh-room-guidance.json',import.meta.url);
const cases=JSON.parse(await readFile(guidancePath,'utf8'));
for(const fixture of cases){
 const guide=(await db.query("select public.waouh_room_guidance($1,'2026-11-04T12:00:00Z'::timestamptz) g",[fixture.room])).rows[0].g;
 for(const [key,value] of Object.entries(fixture.expected))assert.deepEqual(guide[key],value,fixture.name+': '+key);
 if(process.env.UPDATE_GUIDANCE_FIXTURES==='1')fixture.guidance=guide;
 else assert.deepEqual(guide,fixture.guidance,fixture.name+': canonical guidance contract');
}
if(process.env.UPDATE_GUIDANCE_FIXTURES==='1'){const {writeFile}=await import('node:fs/promises');await writeFile(guidancePath,JSON.stringify(cases,null,2)+'\n');}
console.log('Progressive guidance: '+cases.length+' role, evidence, blocked and completion states passed.');
await db.close();
