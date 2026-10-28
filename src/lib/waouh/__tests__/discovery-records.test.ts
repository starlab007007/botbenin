import {describe,it,expect} from 'vitest';
import {loadDiscoveryRecords,discoveryBusinessFacts,publicSearchProfiles} from '../../../../supabase/functions/_shared/waouh-discovery-records';
import {productSnapshot} from '../../../../supabase/functions/_shared/waouh-product-presentation';
import {missionMatches,normalizeMissionContext} from '../../../../supabase/functions/_shared/waouh-mission-domain';
describe('unified discovery',()=>{
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
 it('keeps four safe images of the same product, exact quantities and French attributes',()=>{
  const photos=Array.from({length:5},(_,i)=>`https://images.example/${i}.jpg`);
  expect(discoveryBusinessFacts({title:'Soja',photos}).photos).toHaveLength(4);
  expect(discoveryBusinessFacts({title:'Soja',photos:['https://images.example/p?token=secret','javascript:bad']})).not.toHaveProperty('photos');
  expect(productSnapshot({title:'Soja',ai_attributes:{quantity:1.5,unit:'tonne'}})?.attributes).toEqual(expect.arrayContaining([{label:'Quantité',value:'1,5'},{label:'Unité',value:'tonne'}]));
  expect(normalizeMissionContext({quantity:1.5},'sale').quantity).toBe(1.5);
 });
 it('searches descriptions and categories, merges matches, and filters every public query',async()=>{
  const calls:any[][]=[];let request=0;
  const db={from:(table:string)=>{const call:any[]=[table];calls.push(call);const index=request++;const q:any={};for(const name of ['select','in','or','order','limit'])q[name]=(...args:any[])=>{call.push([name,...args]);return q};q.then=(fn:any)=>Promise.resolve({data:index?[{fabric_id:'a'},{fabric_id:'b'}]:[{fabric_id:'a'}],error:null}).then(fn);return q;}};
  const result=await loadDiscoveryRecords(db,{query:'plombier plomberie',mode:'find_sellers',publicSources:['partner']});
  expect(result.records.map(r=>r.fabric_id)).toEqual(['a','b']);expect(result.coverage.exhaustive).toBe(false);
  for(const c of calls)expect(c).toContainEqual(['in','source_key',['partner']]);
  expect(calls[1].find(x=>x[0]==='or')[1]).toContain('raw_text.ilike.%plombier%');expect(calls[1].find(x=>x[0]==='or')[1]).toContain('category.ilike.%plomberie%');
 });
});
