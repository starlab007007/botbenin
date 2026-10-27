import React,{act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {WaouhAutomaticOffers} from '../WaouhAutomaticOffers';
import {WaouhGuidedProgress} from '../WaouhGuidedProgress';
import type {NexusDiscoveryResult} from '@/lib/waouh/nexus';
vi.mock('../bot/BotLiveAvatar',()=>({BotLiveAvatar:()=> <span>Bot</span>}));
const row=(id:string,price:number,title='iPhone 13'):NexusDiscoveryResult=>({fabric_id:id,subject:title,category:'Téléphone',city:'Cotonou',price_min:price,currency:'XOF',evidence:{},contact_policy:{level:'C0'}} as NexusDiscoveryResult);
let host:HTMLDivElement,root:Root;
beforeEach(()=>{globalThis.IS_REACT_ACT_ENVIRONMENT=true;host=document.createElement('div');document.body.append(host);root=createRoot(host);});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();});
describe('Guided automatic result presentation',()=>{
 it('shows compatible visual cards with automatic comparison and no manual checkboxes',async()=>{
  const action=vi.fn();await act(async()=>root.render(<WaouhAutomaticOffers results={[row('cheap',180000),row('other',190000),row('wrong',100000,'iPhone 18'),row('high',300000)]} criteria={{query:'iPhone 13',city:'Cotonou',budget:220000}} actionLabel="Suivre Bot" onAction={action} renderActions={()=>null}/>));
  expect(host.querySelectorAll('.wgd-tile')).toHaveLength(2);expect(host.querySelectorAll('[type=checkbox]')).toHaveLength(0);expect(host.textContent).not.toContain('iPhone 18');expect(host.textContent).not.toContain('disponibilité confirmés');
  await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent==='Suivre Bot')!.click());expect(action).toHaveBeenCalledOnce();
  await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent?.includes('Mon comparatif'))!.click());expect(document.querySelectorAll('.wgd-compare-row')).toHaveLength(2);
 });
 it('does not display a zero placeholder as a free price',async()=>{
  await act(async()=>root.render(<WaouhAutomaticOffers results={[row('unknown',0)]} criteria={{query:'iPhone 13'}} actionLabel="Suivre Bot" onAction={()=>{}} renderActions={()=>null}/>));
  expect(host.querySelector('.wgd-price')?.textContent).toBe('Prix à demander');expect(host.textContent).not.toContain('0 F CFA');
 });
 it('never recommends an incompatible offer when there is no eligible candidate',async()=>{
  await act(async()=>root.render(<WaouhAutomaticOffers results={[row('wrong',120000,'iPhone 18')]} criteria={{query:'iPhone 13'}} actionLabel="Suivre Bot" onAction={()=>{}} renderActions={()=>null}/>));
  expect(host.querySelector('.wgd-tile')).toBeNull();expect(host.textContent).toContain('Aucune offre compatible');
 });
 it('opens a decision on selection without contacting anyone and preserves assisted actions',async()=>{
  const action=vi.fn();await act(async()=>root.render(<WaouhAutomaticOffers results={[row('chosen',180000)]} criteria={{query:'iPhone 13'}} manualChoice actionLabel="Choisir cette piste" onAction={action} renderActions={()=> <span>Actions à confirmer</span>}/>));
  await act(async()=>host.querySelector<HTMLButtonElement>('.wgd-tile')!.click());
  expect(action).not.toHaveBeenCalled();expect(document.querySelector('[role=dialog]')?.textContent).toContain('Actions à confirmer');expect(document.querySelector('[role=dialog]')?.textContent).toContain('Prix final et unité à confirmer');
 });
 it('keeps an unexplained 100 F price out of recommendations and shows why',async()=>{
  await act(async()=>root.render(<WaouhAutomaticOffers results={[row('tiny',100),row('a',180000),row('b',190000)]} criteria={{query:'iPhone 13'}} actionLabel="Suivre Bot" onAction={()=>{}} renderActions={()=>null}/>));
  expect(host.querySelectorAll('.wgd-tile')).toHaveLength(2);expect(host.querySelector('.wgd-gallery')?.textContent).not.toContain('100 F CFA');expect(host.textContent).toContain('1 prix à clarifier');
 });
 it('shows real pending stages before any offer is received',async()=>{
  await act(async()=>root.render(<WaouhGuidedProgress phase="collecting" count={0} onActivity={()=>{}}/>));
  expect(host.querySelectorAll('.wgd-timeline .current')).toHaveLength(1);expect(host.querySelectorAll('.wgd-timeline .waiting')).toHaveLength(3);expect(host.textContent).toContain('Je recueille les premières pistes');expect(host.textContent).not.toContain('Sélection prête');
 });
});
