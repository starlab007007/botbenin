import assert from 'node:assert/strict';
import {engineAdmin,engineKey,enginePatch,runDocumentEngine,engineDemoHtml} from './waouh-collection/engines.ts';
import {structuredPublicListings} from './waouh-collection/public.ts';

Deno.test('engine settings whitelist types, limits and tool identifiers',()=>{
 assert.throws(()=>engineKey('shell'));
 const settings={engine_key:'scrapy',enabled:true,timeout_seconds:20,max_document_kb:512,token:'never persisted',command:'rm'};
 const {patch}=enginePatch(settings);
 assert.equal('token' in patch,false);assert.equal('command' in patch,false);
 for(const extra of [{timeout_seconds:31},{max_document_kb:1201},{enabled:'true'},{timeout_seconds:0}])assert.throws(()=>enginePatch({...settings,...extra}));
});
Deno.test('engine administration rejects ordinary users and internal automated workers before database access',async()=>{
 const db={from:()=>{throw Error('database must not be reached');},rpc:()=>Promise.resolve({data:null,error:null})};
 for(const actor of ['user','internal','none'])await assert.rejects(engineAdmin(db,{action:'collection.engine.configure'},{actor}),/engine_admin_required/);
});
Deno.test('native Cheerio preserves a qualified listing and records execution without publishing',async()=>{
 const inserts:any[]=[];
 const db={rpc:()=>Promise.resolve({data:null,error:null}),from:(name:string)=>({
  select(){return this;},eq(){return this;},single:()=>Promise.resolve({error:null,data:name==='waouh_collection_targets'?{engine_key:'cheerio'}:{enabled:true,max_document_kb:1200,timeout_seconds:20}}),
  insert:(row:any)=>{assert.equal(name,'waouh_collection_engine_runs');inserts.push(row);return Promise.resolve({error:null});},
 })};
 const html=await runDocumentEngine(db,{id:'job',target_id:'target'},engineDemoHtml,'https://bot.bj/waouh-engine-demo/');
 const rows=structuredPublicListings(html,new URL('https://bot.bj/waouh-engine-demo/'),{attribution:'Démonstration interne WAOUH'});
 assert.equal(rows.length,1);assert.equal(rows[0].price_min,50000);assert.equal(inserts[0].status,'passed');
 assert.equal(inserts[0].purpose,'collection');assert.equal('html' in inserts[0],false);
});
Deno.test('a paused engine blocks execution and records the reason',async()=>{
 const logs:any[]=[];
 const db={rpc:()=>Promise.resolve({data:null,error:null}),from:(name:string)=>({select(){return this;},eq(){return this;},
  single:()=>Promise.resolve({error:null,data:name==='waouh_collection_targets'?{engine_key:'cheerio'}:{enabled:false}}),
  insert:(row:any)=>{logs.push(row);return Promise.resolve({error:null});},
 })};
 await assert.rejects(runDocumentEngine(db,{id:'job',target_id:'target'},engineDemoHtml,'https://bot.bj/'),/engine_paused/);
 assert.equal(logs[0].status,'failed');assert.equal(logs[0].error_code,'engine_paused');
});
