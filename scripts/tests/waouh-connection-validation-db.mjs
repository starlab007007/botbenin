import {PGlite} from '@electric-sql/pglite';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create role service_role;
 create table waouh_collection_platforms(platform_key text primary key,transport text,adapter_key text,access_state text,rights_reference text,media_authorized boolean,updated_at timestamptz default now()-interval '1 hour');
 create table waouh_collection_entries(entry_no integer primary key,label text,platform_key text,alias_of integer,target_id uuid,test_status text,test_at timestamptz,test_config_hash text,test_report jsonb);
 create table waouh_radar_sources(id uuid primary key,active boolean,config jsonb);
 create table waouh_collection_targets(id uuid primary key,label text,enabled boolean,handler text,provider text,radar_source_id uuid,last_outcome text,last_success_at timestamptz,last_useful_at timestamptz);
 create table waouh_collection_jobs(id uuid primary key,target_id uuid,finished_at timestamptz,status text,report jsonb);
 create table waouh_collection_observations(record_id uuid,job_id uuid,record_kind text,last_checked_at timestamptz);
 create table waouh_external_commerce_signals(id uuid primary key,source_url text,product_name text,intent text,price_min numeric,city text,model text,photo_urls text[],evidence jsonb,contactability_level text,contact_consent_basis text,status text,expires_at timestamptz);
 create table waouh_search_documents(fabric_id text primary key);
 insert into waouh_collection_platforms values('example','direct','classifieds','authorized','Existing authorization',true,now()-interval '1 hour');
 insert into waouh_radar_sources values('10000000-0000-4000-8000-000000000001',true,'{"collection_transport":"direct","collection_format":"classifieds","automation_authorized":true,"media_reuse_authorized":true,"private_key":"must-not-leak"}');
 insert into waouh_collection_targets values('20000000-0000-4000-8000-000000000001','Example',true,'site','public_feed','10000000-0000-4000-8000-000000000001','succeeded',now(),now());
 insert into waouh_collection_jobs values('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',now(),'succeeded','{}');
 insert into waouh_external_commerce_signals values('40000000-0000-4000-8000-000000000001','https://example.test/annonce/1','Telephone disponible','SELL',100000,'Cotonou','Model',array['https://example.test/1.jpg'],'{"source_attribution":"Publisher","photo_attribution":"Publisher"}','C1','public_business','active',now()+interval '1 day');
 insert into waouh_collection_observations values('40000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','commerce',now());
 insert into waouh_search_documents values('external:40000000-0000-4000-8000-000000000001');
 insert into waouh_collection_entries values(1,'Example','example',null,'20000000-0000-4000-8000-000000000001','passed',now(),'hash','{}'),
 (2,'Unconnected same domain','example',null,null,'passed',now(),'hash','{}'),
 (3,'Alias','example',1,null,null,null,null,'{}');`);
await db.exec(fs.readFileSync('supabase/migrations/20261125133059_waouh_connection_validation.sql','utf8'));
await db.exec(fs.readFileSync('supabase/migrations/20261125134638_waouh_connection_validation_index.sql','utf8'));
const audit=async()=> (await db.query('select waouh_collection_connection_audit() a')).rows[0].a;
let report=await audit();
assert.equal(report.entries[0].validated,true);
assert.equal(report.entries[1].validated,false); // Same publisher cannot borrow another target's proof.
assert.equal(report.entries[2].validated,true);
assert.equal(report.entries[2].target_id,report.entries[0].target_id);
assert.equal(report.targets[0].facts.actionable,1);
assert.ok(!JSON.stringify(report).includes('must-not-leak'));
await db.exec("update waouh_external_commerce_signals set intent='RFQ',price_min=null,city=null,evidence='{\"organization\":\"Official publisher\",\"photo_attribution\":\"Publisher\"}'");
assert.equal((await audit()).entries[0].validated,true); // Public purchase notices need no invented retail price.
await db.exec("update waouh_external_commerce_signals set intent='SELL',evidence='{\"provider_profile\":true,\"source_attribution\":\"Publisher\",\"photo_attribution\":\"Publisher\"}'");
assert.equal((await audit()).entries[0].validated,true); // A provider profile can be useful without a quote.
await db.exec("update waouh_external_commerce_signals set intent='SELL',price_min=100000,city='Cotonou',evidence='{\"source_attribution\":\"Publisher\",\"photo_attribution\":\"Publisher\"}'");
await db.exec("delete from waouh_search_documents");
assert.ok((await audit()).entries[0].blockers.includes('indexed_records_missing'));
await db.exec("insert into waouh_search_documents values('external:40000000-0000-4000-8000-000000000001');update waouh_external_commerce_signals set contact_consent_basis='unknown'");
report=await audit();assert.equal(report.entries[0].validated,false);assert.equal(report.targets[0].facts.useful,1);assert.equal(report.targets[0].facts.actionable,0);
await db.exec("update waouh_external_commerce_signals set contact_consent_basis='public_business';update waouh_collection_observations set last_checked_at=now()-interval '2 days'");
assert.ok((await audit()).entries[0].blockers.includes('fresh_records_missing'));
await db.exec("update waouh_collection_observations set last_checked_at=now();update waouh_external_commerce_signals set expires_at=now()-interval '1 minute'");
assert.ok((await audit()).entries[0].blockers.includes('fresh_records_missing'));
await db.exec("update waouh_external_commerce_signals set expires_at=now()+interval '1 day';update waouh_collection_entries set test_report='{\"discovery_only\":true}' where entry_no=1");
assert.ok((await audit()).entries[0].blockers.includes('discovery_only'));
await db.exec("update waouh_collection_entries set test_report='{}';update waouh_collection_platforms set transport='apify'");
assert.ok((await audit()).entries[0].blockers.includes('configuration_mismatch'));
await db.exec("update waouh_collection_platforms set transport='direct';insert into waouh_collection_jobs values('30000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001',now()+interval '1 second','blocked','{\"reason\":\"provider_quota_exhausted\"}')");
assert.ok((await audit()).entries[0].blockers.includes('provider_quota_exhausted'));
for(const role of ['anon','authenticated']){
 await db.exec('set role '+role);await assert.rejects(db.query('select waouh_collection_connection_audit()'));await db.exec('reset role');
}
await db.exec(`alter table waouh_external_commerce_signals add column entity_id uuid;
 alter table waouh_collection_jobs add column created_at timestamptz default now();
 create table waouh_entity_contacts(entity_id uuid,channel text,public_value text,metrics jsonb,consent_state text,verification_status text);
 update waouh_collection_jobs set status='succeeded',report='{}';
 update waouh_external_commerce_signals set entity_id='50000000-0000-4000-8000-000000000001',contact_consent_basis='unknown';
 insert into waouh_entity_contacts values('50000000-0000-4000-8000-000000000001','website','https://example.test/annonce/1','{"source_url":"https://example.test/annonce/1","published_contact":true}','unknown','observed');`);
await db.exec(fs.readFileSync('supabase/migrations/20261125164408_waouh_manual_source_routes.sql','utf8'));
report=await audit();assert.equal(report.entries[0].validated,true);assert.equal(report.targets[0].facts.public_contacts,0);assert.equal(report.targets[0].facts.manual_source_routes,1);
await db.exec("update waouh_entity_contacts set consent_state='revoked'");
assert.equal((await audit()).entries[0].validated,false);
await db.exec("update waouh_entity_contacts set consent_state='unknown',public_value='https://example.test/other'");
assert.equal((await audit()).entries[0].validated,false);
await db.close();
console.log('PASS: complete chain, alias identity, target isolation, stale/expired records, index, contacts, discovery-only, transport mismatch, latest failure and private access');
