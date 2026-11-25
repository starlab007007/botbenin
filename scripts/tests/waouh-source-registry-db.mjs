import {PGlite} from '@electric-sql/pglite';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
create table waouh_collection_engines(engine_key text primary key);
insert into waouh_collection_engines values('cheerio'),('crawlee'),('playwright'),('scrapy'),('beautifulsoup'),('crawl4ai');
create table waouh_radar_sources(id uuid primary key default gen_random_uuid(),type text,identifier text,label text,active boolean,scan_freq_min integer,config jsonb,created_at timestamptz default now());
create table waouh_collection_targets(id uuid primary key default gen_random_uuid(),provider text,handler text,radar_source_id uuid unique,label text,enabled boolean,interval_minutes integer,adaptive boolean,engine_key text,url text);
create table waouh_external_commerce_signals(id uuid primary key default gen_random_uuid(),source_url text,source_key text,status text,evidence jsonb,observed_at timestamptz,expires_at timestamptz,created_at timestamptz default now());`);
await db.exec(fs.readFileSync('supabase/migrations/20261125100200_waouh_source_registry.sql','utf8'));
assert.equal((await db.query('select count(*)::int n from waouh_collection_entries')).rows[0].n,50);
assert.equal((await db.query('select count(*)::int n from waouh_collection_platforms')).rows[0].n,37);
assert.equal((await db.query('select count(*)::int n from waouh_collection_targets')).rows[0].n,0);
assert.equal((await db.query('select count(*)::int n from waouh_collection_entries where alias_of is not null')).rows[0].n,4);
const hash='a'.repeat(64);
await assert.rejects(db.query('select waouh_collection_connect_entry(3,$1)',[hash]));
await db.query("update waouh_collection_platforms set access_state='authorized',rights_reference='Contract TEST',attribution='Bambaad' where platform_key='bj.bambaad.com'");
await db.query("update waouh_collection_entries set test_status='passed',test_at=now(),test_config_hash=$1 where entry_no=3",[hash]);
const first=(await db.query('select waouh_collection_connect_entry(3,$1) id',[hash])).rows[0].id;
const again=(await db.query('select waouh_collection_connect_entry(3,$1) id',[hash])).rows[0].id;
assert.equal(first,again);assert.equal((await db.query('select count(*)::int n from waouh_collection_targets')).rows[0].n,1);
await assert.rejects(db.query('select waouh_collection_connect_entry(3,$1)',['b'.repeat(64)]));
await assert.rejects(db.query('select waouh_collection_connect_entry(40,$1)',[hash]));
assert.equal((await db.query("select waouh_collection_reserve_page('h',1) ok")).rows[0].ok,true);
assert.equal((await db.query("select waouh_collection_reserve_page('h',1) ok")).rows[0].ok,false);
const doc=(await db.query("insert into waouh_collection_documents(target_id,url,kind) values($1,'https://bj.bambaad.com/annonce/test-1','detail') returning id",[first])).rows[0].id;
await db.query("insert into waouh_external_commerce_signals(source_url,source_key,status,evidence,observed_at) values('https://bj.bambaad.com/annonce/test-1','waouh_commercial_web','active','{}',now())");
for(let i=0;i<2;i++)await db.query('select waouh_collection_commit_document($1,$2,null,null,$3)',[doc,hash,{title:'Test',price_min:5000,evidence:{photos:['https://media.example/a.jpg']}}]);
assert.equal((await db.query('select count(*)::int n from waouh_collection_document_versions')).rows[0].n,1);
assert.equal((await db.query('select state from waouh_collection_documents where id=$1',[doc])).rows[0].state,'active');
for(const role of ['anon','authenticated']){
 await db.exec('set role '+role);
 for(const table of ['waouh_collection_platforms','waouh_collection_entries','waouh_collection_documents','waouh_collection_document_versions','waouh_collection_page_usage'])
  await assert.rejects(db.query('select * from '+table));
 await assert.rejects(db.query('select waouh_collection_connect_entry(3,$1)',[hash]));await db.exec('reset role');
}
await db.close();console.log('Source registry SQL: 50 entries, 37 hosts, aliases, no activation without recent matching test and rights, idempotent connection, hard quota, version dedupe and role isolation PASS');
