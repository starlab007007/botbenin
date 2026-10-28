import {describe, it, expect, vi} from 'vitest';
import {productPhotos, productSnapshot} from '../../../../supabase/functions/_shared/waouh-product-presentation';
import {missionJourneyLimit, withJourneyProducts, withMandateProducts} from '../../../../supabase/functions/_shared/waouh-mission-feed';
import {normalizeResultCards} from '@/lib/chatReply';
import {normalizeWaouhProductV1} from '../agenticContracts';

const urls=Array.from({length:7},(_,i)=>`https://images.example/${i}.jpg`);
describe('the same product at every stage',()=>{
 it('keeps the primary photo first, deduplicates media objects and caps the gallery at four',()=>{
  expect(productPhotos({evidence:{primary_photo_url:urls[2],photos:[urls[2],` ${urls[0]} `,{url:urls[1]},'javascript:alert(1)',...urls]}})).toEqual([urls[2],urls[0],urls[1],urls[3]]);
 });
 it('preserves product identity and facts while excluding private contact data',()=>{
  const p=productSnapshot({fabric_id:'product-a',subject:'Samsung S25',brand:'Samsung',condition:'Neuf',price_min:250000,currency:'XOF',evidence:{description:'256 Go',photos:urls,contact_phone:'+22912345678',secret:'private'}})!;
  expect(p).toMatchObject({id:'product-a',title:'Samsung S25',price_min:250000,description:'256 Go',photos:urls.slice(0,4)});
  expect(p.attributes).toContainEqual({label:'État',value:'Neuf'});expect(JSON.stringify(p)).not.toContain('22912345678');expect(JSON.stringify(p)).not.toContain('secret');
 });
 it('uses the journey snapshot at any stage and never borrows a neighbouring product image',()=>{
  for(const stage of ['discovered','waiting_reply','negotiating','completed'])expect(productSnapshot({stage,subject:'Demand',evidence:{photos:[urls[5]]},metadata:{product_snapshot:{id:'a',title:'Produit A',photos:[urls[0]]}}})).toMatchObject({id:'a',title:'Produit A',photos:[urls[0]]});
  expect(productSnapshot({title:'Sans image'})).toMatchObject({photos:[],price_min:null,price_max:null});
 });
 it('limits both canonical chat blocks and saved chat results to the same four images',()=>{
  expect(normalizeWaouhProductV1({id:'a',title:'A',photos:urls})?.photos).toHaveLength(4);
  const rows=normalizeResultCards([{id:'a',title:'A',photos:urls},{id:'b',title:'B',photos:[urls[6]]}]);
  expect(rows[0].photos).toEqual(urls.slice(0,4));expect(rows[1].photos).toEqual([urls[6]]);
 });
});
describe('mission feed regression',()=>{
 it('accepts the 100 journeys requested by both clients, and rejects invalid sizes',()=>{
  expect(missionJourneyLimit(100)).toBe(100);expect(missionJourneyLimit()).toBe(20);
  for(const value of [0,101,2.5,'invalid'])expect(()=>missionJourneyLimit(value)).toThrow();
 });
 it('hydrates historical journeys using only the current owner feed references',async()=>{
  const included:string[][]=[],selected:string[]=[];
  const sb={from:vi.fn(()=>({select:(columns:string)=>{selected.push(columns);return {in:async(_column:string,ids:string[])=>{included.push(ids);return {data:[{fabric_id:'a',subject:'Product A',evidence:{photos:urls}}],error:null};}};}}))};
  const result=await withJourneyProducts(sb,[{id:'one',fabric_id:'a',mode:'buy',stage:'completed',metadata:{kept:true}}],'owner');
  expect(included).toEqual([['a']]);expect(selected[0]).not.toMatch(/contact|phone|seller/);
  expect(result[0].metadata).toMatchObject({kept:true,product_snapshot:{title:'Product A',photos:urls.slice(0,4)}});
 });
 it('does not erase the mission if product enrichment is unavailable',async()=>{
  const rows=[{id:'one',fabric_id:'a',metadata:{product_snapshot:{title:'Saved A',photos:[urls[0]]}}}];
  const sb={from:()=>({select:()=>({in:async()=>({error:{message:'unavailable'},data:null})})})};
  expect(await withJourneyProducts(sb,rows,'owner')).toBe(rows);
 });
 it('uses verified seller article photos for a sale, never the buyer demand photos or another owner article',async()=>{
  const sb={from:(table:string)=>({select:()=>({in:async()=>({error:null,data:table==='waouh_signal_fabric'?[{fabric_id:'buyer',subject:'Buyer demand',evidence:{photos:[urls[6]]}}]:[{id:'ours',title:'Our product',photos:urls,price:1000,seller:{auth_user_id:'owner'}},{id:'other',title:'Other private product',photos:[urls[5]],seller:{auth_user_id:'other-owner'}}]})})})};
  const result=await withJourneyProducts(sb,[{id:'one',fabric_id:'buyer',article_id:'ours',mode:'sell'},{id:'two',fabric_id:'buyer',article_id:'other',mode:'sell'}],'owner');
  expect(result[0].metadata.product_snapshot).toMatchObject({id:'ours',title:'Our product',photos:urls.slice(0,4)});expect(result[1].metadata).toBeUndefined();
  const mandate=await withMandateProducts(sb,[{id:'m',mode:'sell',metadata:{article_id:'ours'}}],'owner');
  expect(mandate[0].metadata.article_snapshot.title).toBe('Our product');
 });
});
