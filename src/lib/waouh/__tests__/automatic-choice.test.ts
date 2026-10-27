import {describe,it,expect,vi} from 'vitest';
import {webcrypto} from 'node:crypto';
import cases from '../../../../testdata/waouh-choice-cases.json';
import {rankOfferChoices,choicePriceConfirmed,choiceAvailabilityConfirmed,type ChoiceCriteria,type ChoiceOffer} from '../../../../supabase/functions/_shared/waouh-offer-choice';
import {automaticMissionKey,automaticMandateId,ensureAutomaticIntent,avatarAccountPaused} from '../../../../supabase/functions/_shared/waouh-automatic-mission';

describe('Deterministic automatic choices shared with Flutter',()=>{
 for(const c of cases)it(c.name,()=>expect(rankOfferChoices(c.offers as ChoiceOffer[],c.criteria as ChoiceCriteria).map(o=>o.fabric_id)).toEqual(c.expected));
 it('does not call a listing stock flag a verified availability',()=>{expect(choiceAvailabilityConfirmed({fabric_id:'x',evidence:{in_stock:true}})).toBe(false);expect(choicePriceConfirmed({fabric_id:'x',price_min:100,evidence:{price_confirmed:true}})).toBe(false);});
 it('deduplicates concurrent requests across devices and isolates owners',async()=>{
  vi.stubGlobal('crypto',webcrypto);
  const a=await automaticMissionKey('owner-a',{goal:'iPhone 13',mode:'buy',city:'Cotonou',budget:200000});
  const same=await automaticMissionKey('owner-a',{goal:' IPHONE   13 ',mode:'buy',city:'cotonou',budget:200000});
  const other=await automaticMissionKey('owner-b',{goal:'iPhone 13',mode:'buy',city:'Cotonou',budget:200000});
  expect(a).toBe(same);expect(a).not.toBe(other);
  const ids=await Promise.all(Array.from({length:8},()=>automaticMandateId('owner-a',a,null)));
  expect(new Set(ids).size).toBe(1);expect(ids[0]).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-8[a-f0-9]{3}-[a-f0-9]{12}$/);
  expect(await automaticMandateId('owner-a',a,ids[0])).not.toBe(ids[0]);vi.unstubAllGlobals();
 });
 it('fails closed if the current pause cannot be read',async()=>{
  const chain={select:()=>chain,eq:()=>chain,maybeSingle:async()=>({error:new Error('unavailable')})};
  await expect(avatarAccountPaused({from:()=>chain},'owner')).rejects.toThrow('avatar_pause_check_failed');
 });
 it('recovers the same persistent intent after a concurrent insert',async()=>{
  vi.stubGlobal('crypto',webcrypto);let inserted:Record<string,unknown>|undefined;const filters:Array<[string,unknown]>=[];
  const query={eq:(k:string,v:unknown)=>{filters.push([k,v]);return query;},single:async()=>({data:{id:'existing-intent'},error:null})};
  const db={from:()=>({insert:(row:Record<string,unknown>)=>{inserted=row;return {select:()=>({single:async()=>({error:{code:'23505'},data:null})})};},select:()=>query})};
  expect(await ensureAutomaticIntent(db,{owner_id:'owner',mandate_id:'mandate',status:'active'})).toEqual({id:'existing-intent'});
  expect(inserted?.id).toMatch(/^[a-f0-9-]{36}$/);expect(filters).toContainEqual(['owner_id','owner']);expect(filters).toContainEqual(['mandate_id','mandate']);vi.unstubAllGlobals();
 });

});
