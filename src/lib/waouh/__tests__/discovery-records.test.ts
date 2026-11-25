import {describe,it,expect} from 'vitest';
import {loadDiscoveryRecords,discoveryBusinessFacts,publicSearchProfiles,discoveryRecordCurrent} from '../../../../supabase/functions/_shared/waouh-discovery-records';
import {productSnapshot} from '../../../../supabase/functions/_shared/waouh-product-presentation';
import {missionMatches,normalizeMissionContext} from '../../../../supabase/functions/_shared/waouh-mission-domain';
describe('unified discovery',()=>{
 it('excludes closed opportunities from generic search as well as opportunity missions',()=>{
  const row={fabric_id:'a',evidence:{offer_kind:'announcement',deadline:'2020-01-01'}};
  expect(discoveryRecordCurrent(row,Date.parse('2026-01-01'))).toBe(false);
  expect(discoveryRecordCurrent({...row,evidence:{offer_kind:'announcement'}},Date.parse('2026-01-01'))).toBe(true);
 });
 it('uses opportunity and professional sources for the requested mission',()=>{
  const opportunities=publicSearchProfiles('find_sellers','PME','Cotonou','opportunity');
  expect(opportunities.map(p=>p.q).join(' ')).toContain('appel à projets');
  expect(opportunities.map(p=>p.q).join(' ')).not.toContain('à vendre');
  expect(publicSearchProfiles('find_sellers','plomberie',null,'service')[0].q).toContain('prestataire');
  expect(publicSearchProfiles('find_sellers','site web',null,'project')[0].q).toContain('devis');
  expect(publicSearchProfiles('find_buyers','soja',null,'sale')[0].q).toContain('je cherche');
 });
 it('persists public facts for services, projects and opportunities',()=>{
  const service=discoveryBusinessFacts({product_name:'Atelier Alpha',category:'services',scope:'Réparation',visit_fee:5000,unit:'visite',evidence:{availability:'available',contact_phone:'private',price_floor:4}});
  expect(service).toMatchObject({offer_kind:'service',scope:'Réparation',visit_fee:5000,unit:'visite'});expect(service).not.toHaveProperty('contact_phone');expect(service).not.toHaveProperty('price_floor');
  expect(discoveryBusinessFacts({product_name:'Site vitrine',offer_kind:'prestation',delivery_days:10,scope:'5 pages'})).toMatchObject({offer_kind:'service',delivery_days:10});
  const opportunity=discoveryBusinessFacts({product_name:'Bourse PME',deadline:'2099-01-01',conditions:'Entreprises locales'});
  expect(opportunity.offer_kind).toBe('announcement');expect(missionMatches({fabric_id:'op',evidence:opportunity},{missionKind:'opportunity'})).toBe(true);
 });
 it('keeps every safe image of the same product, exact quantities and French attributes',()=>{
  const photos=Array.from({length:5},(_,i)=>`https://images.example/${i}.jpg`);
  expect(discoveryBusinessFacts({title:'Soja',photos}).photos).toHaveLength(5);
  expect(discoveryBusinessFacts({title:'Soja',photos:['https://images.example/p?token=secret','javascript:bad']})).not.toHaveProperty('photos');
  expect(productSnapshot({title:'Soja',ai_attributes:{quantity:1.5,unit:'tonne'}})?.attributes).toEqual(expect.arrayContaining([{label:'Quantité',value:'1,5'},{label:'Unité',value:'tonne'}]));
  expect(normalizeMissionContext({quantity:1.5},'sale').quantity).toBe(1.5);
 });
 it('queries the shared indexed gateway with source and locality filters',async()=>{
  const calls:any[]=[];
  const db={from:()=>{throw Error('no table scan');},rpc:async(name:string,args:any)=>{calls.push([name,args]);return {data:{records:[{fabric_id:'a'},{fabric_id:'b'}],total:1200,limit:200,offset:0,next_offset:200},error:null};}};
  const result=await loadDiscoveryRecords(db,{query:'plombier',mode:'find_sellers',publicSources:['partner'],city:'Calavi',budgetMax:50000});
  expect(result.records.map(r=>r.fabric_id)).toEqual(['a','b']);expect(result.coverage).toMatchObject({indexed:true,total:1200,exhaustive:false,next_offset:200});
  expect(calls[0]).toEqual(['waouh_search_unified',expect.objectContaining({p_query:'plombier plomberie',p_sources:['partner'],p_city:'Calavi',p_budget:50000})]);
 });
 it('does not silently replace an unavailable common index with a partial table scan',async()=>{
  const db={from:()=>{throw Error('must not scan');},rpc:async()=>({data:null,error:{message:'unavailable'}})};
  await expect(loadDiscoveryRecords(db,{query:'iphone',mode:'find_sellers'})).rejects.toThrow('discovery_records_unavailable');
 });
});
