import { strict as assert } from 'node:assert';
import { planAvatarNegotiationStart as plan, dispatchAvatarNegotiationStart as dispatch } from './waouh-avatar-negotiation-start.ts';
const now = Date.parse('2026-11-04T10:00:00Z');
const mandate = {status:'active',mode:'buy',autonomy_mode:'autonomous',budget_max:25000,expires_at:'2026-11-05T10:00:00Z',metadata:{}};
const journey = {id:'journey',thread_id:'thread',article_id:'article',stage:'negotiating',metadata:{}};
Deno.test('Initial offer uses the advertised price bounded by the budget, never acceptance',()=>{
  assert.deepEqual(plan(mandate,journey,30000,false,now),{kind:'offer',amount:25000});
  assert.deepEqual(plan(mandate,journey,23000,false,now),{kind:'offer',amount:23000});
});
Deno.test('Unknown prices and missing budgets request a quote without inventing an amount',()=>{
  for(const price of [null,0,NaN,Infinity,'unknown']) assert.equal(plan(mandate,journey,price,false,now).kind,'quote');
  assert.equal(plan({...mandate,budget_max:null},journey,30000,false,now).kind,'quote');
  assert.equal(plan({...mandate,mode:'sell'},journey,30000,false,now).kind,'quote');
});
Deno.test('Assisted and semi-autonomous mandates require approval before the first proposal',()=>{
  for(const mode of ['assisted','semi_autonomous']) {
    assert.equal(plan({...mandate,autonomy_mode:mode},journey,30000,false,now).kind,'approval');
    assert.equal(plan({...mandate,autonomy_mode:mode},journey,30000,true,now).kind,'offer');
  }
  assert.equal(plan({...mandate,metadata:{autonomy_settings:{allow_negotiate:false}}},journey,30000,false,now).kind,'approval');
});
Deno.test('Paused, expired, agreed and already started journeys never start again',()=>{
  for(const patch of [{status:'paused'},{allow_waouh:false},{expires_at:'invalid'},{expires_at:'2026-11-04T09:00:00Z'},{metadata:{agreement_reached_at:'yes'}}]) {
    assert.equal(plan({...mandate,...patch},journey,30000,true,now).kind,'wait');
  }
  for(const patch of [{negotiation_id:'existing'},{metadata:{initial_negotiation_sent:true}},{thread_id:null},{stage:'waiting_reply'}]) {
    assert.equal(plan(mandate,{...journey,...patch},30000,true,now).kind,'wait');
  }
});
Deno.test('Dispatch retries keep the same key and require an actual negotiation response',async()=>{
  const bodies:any[]=[];
  const send=async(body:any)=>{bodies.push(body);return {ok:true,thread_id:'thread',negotiation_id:'neg'};};
  await dispatch(journey,{kind:'offer',amount:25000},send);
  await dispatch(journey,{kind:'offer',amount:25000},send);
  assert.equal(bodies[0].idem,bodies[1].idem);
  assert.equal(bodies[0].action,'offer');
  assert.equal(bodies[0].amount,25000);
  for(const result of [{ok:false},{ok:true,thread_id:'thread'},{ok:true,thread_id:'other',negotiation_id:'neg'},{ok:true,thread_id:'thread',negotiation_id:'neg',pending:{}}]) {
    await assert.rejects(dispatch(journey,{kind:'offer',amount:25000},async()=>result));
  }
});
Deno.test('Quote dispatch requires confirmation and never sends a numeric offer',async()=>{
  let body:any;
  await dispatch(journey,{kind:'quote',text:'Votre devis ?'},async(value)=>{body=value;return {ok:true,thread_id:'thread'};});
  assert.equal(body.action,'ask');assert.equal(body.amount,undefined);assert.equal(body.confirmed,true);
});
