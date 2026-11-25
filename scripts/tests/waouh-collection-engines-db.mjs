import {PGlite} from '@electric-sql/pglite';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
create table public.waouh_collection_targets(id uuid primary key,enabled boolean);
create table public.waouh_collection_jobs(id uuid primary key);
insert into public.waouh_collection_targets values('00000000-0000-4000-8000-000000000001',false);
create schema vault;create table vault.secrets(name text,decrypted_secret text);create view vault.decrypted_secrets as select * from vault.secrets;
create function vault.create_secret(value text,key text) returns void language sql as $$insert into vault.secrets values(key,value)$$;`);
await db.exec(fs.readFileSync('supabase/migrations/20261125061552_waouh_collection_engines.sql','utf8'));
assert.equal((await db.query('select * from public.waouh_collection_engines')).rows.length,6);
assert.deepEqual((await db.query('select engine_key,enabled from public.waouh_collection_targets')).rows,[{engine_key:'cheerio',enabled:false}]);
for(const role of ['anon','authenticated']){
 await db.exec('set role '+role);
 for(const sql of ['select * from public.waouh_collection_engines','select * from public.waouh_collection_engine_runs','select public.waouh_collection_engine_token()'])await assert.rejects(db.query(sql));
 await db.exec('reset role');
}
await db.exec('set role service_role');
assert.equal((await db.query('select public.waouh_collection_engine_token() token')).rows[0].token.length,64);
await assert.rejects(db.exec("update public.waouh_collection_engines set timeout_seconds=300 where engine_key='scrapy'"));
await assert.rejects(db.exec("update public.waouh_collection_engines set max_document_kb=9999 where engine_key='scrapy'"));
await db.exec("update public.waouh_collection_engines set enabled=false where engine_key='scrapy'");
assert.equal((await db.query("select enabled from public.waouh_collection_engines where engine_key='scrapy'")).rows[0].enabled,false);
await db.close();console.log('Collection engines SQL: six engines, bounded settings, existing pause preservation and credential isolation passed');
