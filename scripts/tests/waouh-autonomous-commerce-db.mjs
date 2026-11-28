import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
const storage=await mkdtemp(join(tmpdir(),'waouh-autonomous-commerce-'));
let db=new PGlite(storage);
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function public.is_admin(uuid) returns boolean language sql as $$select false$$;
create function public.waouh_module_policy(uuid) returns table(module_key text,visible boolean,access_enabled boolean,automation_enabled boolean) language sql as $$select k,true,true,true from unnest(array['nexus','missions','avatar']) k$$;
create table public.waouh_users(id uuid primary key,auth_user_id uuid);create table public.waouh_avatar_prefs(auth_user_id uuid,autonomy_settings jsonb);create table public.waouh_articles(id uuid primary key,seller_id uuid,status text);
create table public.waouh_notifications(user_id uuid,notification_type text,article_id uuid,photos text[],payload jsonb,channel text,delivery_status text,dedupe_key text unique);`);
for(const f of ['20261024095753_waouh_convergence.sql','20261024103115_waouh_convergence_group_quote_guard.sql','20261029214830_waouh_business_journey.sql','20261030075851_waouh_atomic_interest.sql','20261104082300_waouh_unified_deal_rooms.sql','20261104105439_waouh_room_followup_resume_cooldown.sql','20261104111700_waouh_room_progressive_guidance.sql','20261106130900_waouh_receipt_mutual_proof.sql','20261106190000_waouh_room_guidance_restore_and_agreement_lock.sql','20261106200000_waouh_opportunity_outcome.sql','20261106220000_waouh_room_external_owner.sql'])await db.exec(await readFile(new URL('../../supabase/migrations/'+f,import.meta.url),'utf8'));
for(const f of ['20261116214600_waouh_sale_deal_rooms.sql','20261127171000_waouh_room_autonomy_atomic.sql','20261128100000_waouh_autonomous_commerce.sql'])await db.exec(await readFile(new URL('../../supabase/migrations/'+f,import.meta.url),'utf8'));
await db.exec("create or replace function public.waouh_module_policy(uuid) returns table(module_key text,visible boolean,access_enabled boolean,automation_enabled boolean) language sql as $p$select k,true,true,true from unnest(array['nexus','missions','avatar']) k$p$;");
const owner='00000000-0000-4000-8000-000000000101',seller='00000000-0000-4000-8000-000000000102',ownerUser='00000000-0000-4000-8000-000000000111';
for(const id of [owner,seller])await db.query('insert into auth.users values($1)',[id]);
await db.query('insert into public.waouh_users values($1,$1)',[seller]);await db.query('insert into public.waouh_users values($1,$2)',[ownerUser,owner]);
const cmd=async(actor,action,p={})=>(await db.query('select public.waouh_room_command($1,$2,$3) d',[actor,action,['get','list','events'].includes(action)?p:{request_id:crypto.randomUUID(),...p}])).rows[0].d;
const tick=async(id)=>{await db.query('update public.waouh_deal_room_links set next_run_at=now() where id=$1 and control_mode=$2',[id,'bot']);await db.query('select public.waouh_room_tick(5,$1)',[id]);};
const notes=async(prefix)=>(await db.query('select payload->>\'text\' t from public.waouh_notifications where user_id=$1 and dedupe_key like $2 order by dedupe_key',[ownerUser,prefix+'%'])).rows.map(r=>r.t);
const article=async(n)=>{const id='00000000-0000-4000-8000-0000000002'+String(n).padStart(2,'0');await db.query("insert into public.waouh_articles values($1,$2,'active')",[id,seller]);return id;};
const hours={active_start:'00:00',active_end:'23:59'};
const terms=(amount)=>({amount,quantity:1,scope:'Un ordinateur',deadline:'Demain',exclusions:'Aucune',expected_result:'Ordinateur testé',payment:'À la remise'});

// 1. Achat autonome : chaque action de Bot et le geste attendu sont notifiés au propriétaire, une seule fois.
let a1=await article(1);let r=await cmd(owner,'open',{source:{title:'Ordinateur portable',source_ref:'article:'+a1,kind:'product',amount:260000,source_snapshot:{}},city:'Cotonou',confirmed:false});
const buy=r.deal_room_id;
r=await cmd(owner,'delegate',{deal_room_id:buy,mandate_revision:r.mandate_revision??0,confirmed:true,rules:{mode:'autonomous',strategy:'buy',budget_max:250000,initial_offer:230000,duration_hours:72,max_followups:1,...hours}});
await tick(buy);await tick(buy);
assert.deepEqual(await notes('bot-first:'+buy),['Bot a contacté l’interlocuteur pour « Ordinateur portable ».']);
r=await cmd(seller,'propose',{deal_room_id:buy,version:0,terms:terms(270000)});await tick(buy);
r=await cmd(owner,'get',{deal_room_id:buy});assert.equal(r.agreement.terms.amount,250000,'Bot counters at the private ceiling');
assert.equal((await notes('bot-counter:'+buy)).length,1);assert.match((await notes('bot-counter:'+buy))[0],/Bot a proposé 250000 FCFA/);
r=await cmd(seller,'accept',{deal_room_id:buy,version:r.agreement.version});await tick(buy);await tick(buy);
const decision=await notes('bot-decision:'+buy);assert.equal(decision.length,1);assert.match(decision[0],/Validez l’accord en un geste/);
r=await cmd(owner,'get',{deal_room_id:buy});assert.equal(r.agreement.owner_accepted_at,null,'Bot never accepts for the owner');
r=await cmd(owner,'accept',{deal_room_id:buy,version:r.agreement.version});assert.equal(r.agreement.status,'accepted');assert.equal(r.control_mode,'manual');
console.log('Buy: first contact, counter at the ceiling and the single owner gesture are notified once; Bot never accepts on the owner’s behalf.');

// 2. Offre dans les limites proposée par l'interlocuteur : un geste demandé, rien d'accepté automatiquement.
let a2=await article(2);r=await cmd(owner,'open',{source:{title:'Imprimante',source_ref:'article:'+a2,kind:'product',amount:90000,source_snapshot:{}},city:'Cotonou',confirmed:false});
const within=r.deal_room_id;
r=await cmd(owner,'delegate',{deal_room_id:within,mandate_revision:r.mandate_revision??0,confirmed:true,rules:{mode:'autonomous',strategy:'buy',budget_max:100000,duration_hours:72,max_followups:1,...hours}});
await tick(within);r=await cmd(seller,'propose',{deal_room_id:within,version:0,terms:terms(95000)});await tick(within);
assert.match((await notes('bot-decision:'+within))[0],/respecte vos limites/);
assert.equal((await cmd(owner,'get',{deal_room_id:within})).agreement.status,'proposed');
console.log('Within limits: the owner is asked for one gesture; nothing is accepted automatically.');

// 3. Service : Bot demande un devis et le propriétaire en est prévenu.
let a3=await article(3);r=await cmd(owner,'open',{source:{title:'Plombier',source_ref:'article:'+a3,kind:'service',amount:20000,source_snapshot:{}},city:'Cotonou',confirmed:false});
const service=r.deal_room_id;
await cmd(owner,'delegate',{deal_room_id:service,mandate_revision:r.mandate_revision??0,confirmed:true,rules:{mode:'autonomous',strategy:'service',budget_max:30000,duration_hours:72,max_followups:1,...hours}});
await tick(service);
assert.deepEqual(await notes('bot-first:'+service),['Bot a demandé un devis pour « Plombier ».']);
assert.ok((await cmd(owner,'get',{deal_room_id:service})).messages.some(m=>m.author_kind==='bot'&&m.text.includes('périmètre')));
console.log('Service: Bot requests a detailed quote and notifies the owner.');

// 4. Opportunité autonome : dossier obligatoire, transmission par Bot une seule fois, dépôt enregistré, réponse de l'annonceur.
let a4=await article(4);r=await cmd(owner,'open',{source:{title:'Assistant administratif',source_ref:'article:'+a4,kind:'announcement',amount:0,source_snapshot:{}},city:'Cotonou',confirmed:false});
const job=r.deal_room_id;const base={mode:'autonomous',strategy:'opportunity',budget_max:null,duration_hours:72,max_followups:1,...hours};
await assert.rejects(cmd(owner,'delegate',{deal_room_id:job,mandate_revision:r.mandate_revision??0,confirmed:true,rules:base}),/application_dossier_required/);
await assert.rejects(cmd(owner,'delegate',{deal_room_id:job,mandate_revision:r.mandate_revision??0,confirmed:true,rules:{...base,application:{summary:'Trop court'}}}),/application_dossier_required/);
const summary='Licence en gestion, 3 ans d’expérience en secrétariat, maîtrise de la bureautique, disponible immédiatement à Cotonou.';
r=await cmd(owner,'delegate',{deal_room_id:job,mandate_revision:r.mandate_revision??0,confirmed:true,rules:{...base,application:{summary}}});assert.equal(r.control_mode,'bot');
await tick(job);await tick(job);
r=await cmd(owner,'get',{deal_room_id:job});
const sent=r.messages.filter(m=>m.author_kind==='bot'&&m.text.includes(summary));assert.equal(sent.length,1,'Application transmitted exactly once');
assert.ok(r.evidence.application_submitted_at,'Submission recorded');assert.equal(r.agreement,null,'No fabricated purchase agreement');
assert.deepEqual(await notes('bot-first:'+job),['Bot a transmis votre candidature pour « Assistant administratif ».']);
const peer=await cmd(seller,'get',{deal_room_id:job});assert.equal(peer.mandate,null,'Announcer never sees the mandate');
await cmd(seller,'application_outcome',{deal_room_id:job,outcome:'retained',text:'Entretien lundi'});
r=await cmd(owner,'get',{deal_room_id:job});assert.equal(r.control_mode,'manual');assert.equal(r.evidence.application_outcome,'retained');
assert.equal(Number((await db.query("select count(*) n from public.waouh_notifications where dedupe_key='application-outcome:'||$1",[job])).rows[0].n),1);
const botCount=r.messages.filter(m=>m.author_kind==='bot').length;await db.query("update public.waouh_deal_room_links set next_run_at=now() where id=$1",[job]);await db.query('select public.waouh_room_tick(5,$1)',[job]);assert.equal((await cmd(owner,'get',{deal_room_id:job})).messages.filter(m=>m.author_kind==='bot').length,botCount,'Bot stops after the answer');
console.log('Opportunity: dossier required, Bot transmits once, submission recorded, announcer answers, candidate notified, Bot stops.');

// 5. Sans annonceur présent, rien n'est transmis (consentement).
r=await cmd(owner,'open',{source:{title:'Stage',source_ref:'external:stage-1',kind:'announcement',amount:0,source_snapshot:{}},city:'Cotonou',confirmed:false});
const ext=r.deal_room_id;
r=await cmd(owner,'delegate',{deal_room_id:ext,mandate_revision:r.mandate_revision??0,confirmed:true,rules:{...base,application:{summary}}});
await tick(ext);r=await cmd(owner,'get',{deal_room_id:ext});
assert.equal(r.messages.filter(m=>m.author_kind==='bot'&&m.text.includes(summary)).length,0);assert.ok(!r.evidence?.application_submitted_at);
assert.equal((await notes('bot-first:'+ext)).length,0);
console.log('Consent: no announcer in the exchange, nothing is transmitted.');
await db.close();await rm(storage,{recursive:true,force:true});
