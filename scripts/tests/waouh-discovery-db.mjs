import {PGlite} from '@electric-sql/pglite';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const db=new PGlite();
await db.exec(fs.readFileSync(new URL('../../tests/fixtures/discovery-schema.sql',import.meta.url),'utf8'));
await db.exec(fs.readFileSync(new URL('../../supabase/migrations/20261028113539_waouh_unified_discovery_facts.sql',import.meta.url),'utf8'));
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const photos=Array.from({length:5},(_,i)=>`https://images.example/photo-${i}.jpg`);
const insert=async(table,row)=>db.query(`insert into ${table}(${Object.keys(row).join(',')}) values(${Object.keys(row).map((_,i)=>'$'+(i+1)).join(',')})`,Object.values(row));
const get=async(key)=>(await db.query('select * from waouh_signal_fabric where fabric_id=$1',[key])).rows[0];
await insert('waouh_articles',{id:id(1),seller_id:id(20),title:'Soja',status:'active',source_channel:'web',price:70000,photos,ai_attributes:{quantity:1.5,unit:'tonne',offer_kind:'product',request_id:'private',location:'private'}});
const sale=await get('article:'+id(1));
assert.equal(sale.source_key,'waouh_app');assert.equal(sale.contactability_level,'C2');
assert.equal(sale.evidence.quantity,1.5);assert.equal(sale.evidence.unit,'tonne');assert.equal(sale.evidence.photos.length,4);
assert.equal(sale.evidence.request_id,undefined);assert.equal(sale.evidence.location,undefined);
await insert('waouh_unified_catalog',{id:id(2),source:'chat',source_ref_id:id(1),type:'offer',is_active:true,titre:'Soja'});
assert.equal(await get('catalog:'+id(2)),undefined);
await insert('waouh_articles',{id:id(3),title:'Expired',status:'active',expires_at:'2000-01-01'});
assert.equal(await get('article:'+id(3)),undefined);
await db.query("update waouh_articles set status='sold' where id=$1",[id(1)]);
assert.equal(await get('article:'+id(1)),undefined);assert.equal(await get('catalog:'+id(2)),undefined);
await insert('waouh_unified_catalog',{id:id(4),source:'partner',type:'offer',is_active:true,titre:'Atelier Alpha',categorie:'services',photos,
 raw_payload:{offer_kind:'service',scope:'Visite et diagnostic',visit_fee:5000,diagnostic_fee:2000,availability:'available',contact_phone:'private',price_floor:4000}});
const service=await get('catalog:'+id(4));assert.equal(service.evidence.offer_kind,'service');assert.equal(service.evidence.visit_fee,5000);assert.equal(service.evidence.photos.length,4);assert.equal(service.evidence.contact_phone,undefined);assert.equal(service.evidence.price_floor,undefined);
await insert('waouh_unified_catalog',{id:id(5),source:'partner',type:'demand',is_active:true,titre:'Recherche prestataire',raw_payload:{offer_kind:'prestation',quantity:2,unit:'site',scope:'5 pages'}});
assert.equal((await get('catalog:'+id(5))).intent,'BUY');assert.equal((await get('catalog:'+id(5))).evidence.scope,'5 pages');
await insert('waouh_buyer_profiles',{id:id(6),user_id:id(20),query_text:'Recherche soja',is_active:true,reference_photos:photos,ai_intent:{city:'Parakou',quantity:1.5,unit:'tonne'}});
const buyer=await get('buyer:'+id(6));assert.equal(buyer.city,'Parakou');assert.equal(buyer.evidence.quantity,1.5);assert.equal(buyer.evidence.photos.length,4);
await insert('waouh_external_commerce_signals',{id:id(7),source_key:'benin_directory',status:'active',intent:'ANNOUNCE',product_name:'Bourse',quantity:2,unit:'places',photo_urls:[],evidence:{photos:photos.slice(0,4),offer_kind:'announcement',deadline:'2099-01-01',conditions:'PME'},ai_extraction:{scope:'Formation',secret:'private'}});
const opportunity=await get('external:'+id(7));assert.equal(opportunity.evidence.photos.length,4);assert.equal(opportunity.evidence.quantity,2);assert.equal(opportunity.evidence.scope,'Formation');assert.equal(opportunity.evidence.secret,undefined);assert.equal(opportunity.evidence.deadline,'2099-01-01');
await insert('waouh_radar_signals',{id:id(8),status:'converted',promoted_article_id:id(1),product:{name:'Soja'}});assert.equal(await get('radar:'+id(8)),undefined);
assert.equal((await db.query("select count(*)::int n from waouh_articles")).rows[0].n,2); // history is retained
for(const role of ['anon','authenticated']){await db.exec(`set role ${role}`);await assert.rejects(get('catalog:'+id(4)));await db.exec('reset role');}
await db.exec('set role service_role');assert.ok(await get('catalog:'+id(4)));await db.exec('reset role');
await db.close();console.log('Unified discovery: sale/service/project/opportunity/demand, 4 photos, fractional quantity, live expiry, mirror suppression and private access PASS');
