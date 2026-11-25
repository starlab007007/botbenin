import {PGlite} from '@electric-sql/pglite';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create role service_role;
create table waouh_external_commerce_signals(id integer primary key,source_url text,source_key text,status text,evidence jsonb,actor_type text,observed_at timestamptz,created_at timestamptz default now(),expires_at timestamptz);
create table waouh_radar_sources(id integer primary key,type text,identifier text,active boolean,config jsonb);
create table waouh_collection_targets(id integer primary key,radar_source_id integer,enabled boolean);
create table waouh_collection_pages(target_id integer,url text,kind text,unique(target_id,url));
insert into waouh_external_commerce_signals(id,source_url,source_key,status,evidence,actor_type,observed_at) values
 (1,'https://bj.coinafrique.com/annonce/phone-1','waouh_commercial_web','active','{"model":"iPhone 13","photos":["a.jpg"]}','seller',now()-interval '60 days'),
 (2,'https://business.example/profile','directory','active','{}','business',now()-interval '60 days'),
 (3,'https://bj.coinafrique.com/annonce/phone-3','waouh_commercial_web','active','{}','seller',now()-interval '1 day');
insert into waouh_radar_sources values(1,'site','https://bj.coinafrique.com/',true,'{"automation_authorized":true,"collection_transport":"direct","media_reuse_authorized":false}'),
 (2,'site','https://not-authorized.example/',true,'{}');
insert into waouh_collection_targets values(1,1,true),(2,2,true);`);
const sql=fs.readFileSync('supabase/migrations/20261125125453_waouh_collection_revalidation_recovery.sql','utf8');
await db.exec(sql);await db.exec(sql);
const rows=(await db.query('select id,status,evidence,expires_at,observed_at from waouh_external_commerce_signals order by id')).rows;
assert.equal(rows[0].status,'expired');assert.equal(rows[1].status,'active');assert.equal(rows[2].status,'active');
assert.equal(rows[0].evidence.model,'iPhone 13');assert.deepEqual(rows[0].evidence.photos,['a.jpg']);
assert.equal((await db.query('select count(*)::int n from waouh_collection_pages')).rows[0].n,2);
assert.equal((await db.query('select config from waouh_radar_sources where id=2')).rows[0].config.managed_catalog,undefined);
assert.equal((await db.query('select config from waouh_radar_sources where id=1')).rows[0].config.media_reuse_authorized,false);
for(const role of ['anon','authenticated']){
 await db.exec('set role '+role);await assert.rejects(db.query('select waouh_collection_expire_stale()'));await db.exec('reset role');
}
assert.equal((await db.query('select waouh_collection_expire_stale() n')).rows[0].n,0);
await db.exec(`create table waouh_collection_jobs(id uuid primary key default gen_random_uuid(),target_id integer,provider text,handler text,inline boolean default false,status text,not_before timestamptz default now(),lease_until timestamptz,priority integer default 1,created_at timestamptz default now());
create table waouh_collection_policies(provider text primary key,paused boolean default false,cooldown_until timestamptz);
create function waouh_collection_claim(uuid) returns jsonb language sql as 'select jsonb_build_object(''id'',$1)';
insert into waouh_collection_policies(provider) values('serpapi');
insert into waouh_collection_jobs(target_id,provider,handler,status) values(1,'serpapi','web','queued');`);
await db.exec(fs.readFileSync('supabase/migrations/20261125130308_waouh_collection_web_claim.sql','utf8'));
assert.ok((await db.query("select waouh_collection_claim_targeted(array['web']) j")).rows[0].j.id);
assert.equal((await db.query("select waouh_collection_claim_targeted(array['site']) j")).rows[0].j,null);
await db.exec("update waouh_collection_policies set paused=true");
assert.equal((await db.query("select waouh_collection_claim_targeted(array['web']) j")).rows[0].j,null);
await db.exec("update waouh_collection_policies set paused=false,cooldown_until=now()+interval '1 hour'");
assert.equal((await db.query("select waouh_collection_claim_targeted(array['web']) j")).rows[0].j,null);
await db.close();console.log('Web jobs claimable; handler filters, provider pauses and cooldowns enforced.');console.log('PASS: bounded legacy freshness, business window, original facts preserved, authorized revalidation only, idempotent seeds and private execution');
