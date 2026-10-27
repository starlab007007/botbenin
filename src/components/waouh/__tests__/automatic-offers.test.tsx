import React,{act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {WaouhAutomaticOffers} from '../WaouhAutomaticOffers';
import type {NexusDiscoveryResult} from '@/lib/waouh/nexus';
vi.mock('../bot/BotLiveAvatar',()=>({BotLiveAvatar:()=> <span>Bot</span>}));
const row=(id:string,price:number,title='iPhone 13'):NexusDiscoveryResult=>({fabric_id:id,subject:title,category:'Téléphone',city:'Cotonou',price_min:price,currency:'XOF',evidence:{},contact_policy:{level:'C0'}} as NexusDiscoveryResult);
let host:HTMLDivElement,root:Root;
beforeEach(()=>{globalThis.IS_REACT_ACT_ENVIRONMENT=true;host=document.createElement('div');document.body.append(host);root=createRoot(host);});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();});
describe('Minimal automatic result presentation',()=>{
 it('shows one eligible recommendation and hides alternatives without manual checkboxes',async()=>{
  const action=vi.fn();await act(async()=>root.render(<WaouhAutomaticOffers results={[row('cheap',180000),row('other',190000),row('wrong',100000,'iPhone 18'),row('high',300000)]} criteria={{query:'iPhone 13',city:'Cotonou',budget:220000}} actionLabel="Suivre Bot" onAction={action} renderActions={()=>null}/>));
  expect(host.querySelectorAll('.wmn-offer')).toHaveLength(1);expect(host.querySelectorAll('.wmn-alternative')).toHaveLength(0);expect(host.querySelectorAll('[type=checkbox]')).toHaveLength(0);expect(host.textContent).not.toContain('iPhone 18');expect(host.textContent).not.toContain('disponibilité confirmés');
  await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent==='Suivre Bot')!.click());expect(action).toHaveBeenCalledOnce();
  await act(async()=>host.querySelector<HTMLButtonElement>('.wmn-alternatives')!.click());expect(host.querySelectorAll('.wmn-alternative')).toHaveLength(1);
  await act(async()=>host.querySelector<HTMLButtonElement>('.wmn-choice-reason')!.click());expect(document.querySelectorAll('.wmn-table tbody tr')).toHaveLength(2);
 });
 it('does not display a zero placeholder as a free price',async()=>{
  await act(async()=>root.render(<WaouhAutomaticOffers results={[row('unknown',0)]} criteria={{query:'iPhone 13'}} actionLabel="Suivre Bot" onAction={()=>{}} renderActions={()=>null}/>));
  expect(host.querySelector('.wmn-price')?.textContent).toBe('Prix à demander');expect(host.textContent).not.toContain('0 F CFA');
 });
 it('never recommends an incompatible offer when there is no eligible candidate',async()=>{
  await act(async()=>root.render(<WaouhAutomaticOffers results={[row('wrong',120000,'iPhone 18')]} criteria={{query:'iPhone 13'}} actionLabel="Suivre Bot" onAction={()=>{}} renderActions={()=>null}/>));
  expect(host.querySelector('.wmn-offer')).toBeNull();expect(host.textContent).toContain('Aucune offre compatible');
 });
});
