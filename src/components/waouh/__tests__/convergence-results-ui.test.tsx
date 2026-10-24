import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
import { WaouhProductResults } from '../WaouhProductCard';
const rows=Array.from({length:10},(_,i)=>({id:`a${i+1}`,article_id:`a${i+1}`,index:i+1,title:`Offre ${i+1}`,price:(i+1)*1000,photos:[],source:'waouh',actions:[{id:`je-veux:a${i+1}`,label:`Je le veux à ${(i+1)*1000} FCFA`}]}));
let host:HTMLDivElement,root:Root;
beforeEach(()=>{globalThis.IS_REACT_ACT_ENVIRONMENT=true;host=document.createElement('div');document.body.append(host);root=createRoot(host);});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();});
const button=(label:string)=>Array.from(host.querySelectorAll('button')).find(b=>b.textContent===label)!;
describe('premium results interactions',()=>{
 it('makes all ten accessible and preserves canonical identity after visual sorting',async()=>{
  const action=vi.fn();await act(async()=>root.render(<MemoryRouter><WaouhProductResults results={rows} onAction={action}/></MemoryRouter>));
  expect(host.querySelectorAll('.wr-vip-card')).toHaveLength(5);
  await act(async()=>host.querySelector<HTMLButtonElement>('[aria-label="Résultats suivants"]')!.click());
  expect(host.querySelector('.wr-card-title h4')?.textContent).toBe('Offre 6');
  await act(async()=>{const select=host.querySelector('select')!;select.value='desc';select.dispatchEvent(new Event('change',{bubbles:true}));});
  expect(host.querySelector('.wr-card-title h4')?.textContent).toBe('Offre 10');
  await act(async()=>button('Je le veux à 10000 FCFA').click());
  expect(action).toHaveBeenCalled();expect(action.mock.calls[0][1]).toMatchObject({article_id:'a10',button_payload:'je-veux:a10'});
  await act(async()=>button('Afficher les 10 résultats ensemble').click());expect(host.querySelectorAll('.wr-vip-card')).toHaveLength(10);
 });
 it('enforces maximum five comparison selections across pages',async()=>{
  await act(async()=>root.render(<MemoryRouter><WaouhProductResults results={rows}/></MemoryRouter>));
  for(const c of host.querySelectorAll<HTMLInputElement>('.wr-pick input'))await act(async()=>c.click());
  expect(button('Comparer 5/5')).toBeTruthy();
  await act(async()=>host.querySelector<HTMLButtonElement>('[aria-label="Résultats suivants"]')!.click());
  await act(async()=>host.querySelector<HTMLInputElement>('.wr-pick input')!.click());
  expect(host.querySelector<HTMLInputElement>('.wr-pick input')!.checked).toBe(false);expect(button('Comparer 5/5')).toBeTruthy();
  expect(host.textContent).toContain('Retirez-en une');
 });
 it('routes an announcement to response preparation without a price negotiation',async()=>{
  await act(async()=>root.render(<MemoryRouter><WaouhProductResults results={[{...rows[0],offer_kind:'announcement'} as any]}/></MemoryRouter>));
  expect(button('Préparer une réponse à l’annonce')).toBeTruthy();expect(host.textContent).not.toContain('Proposer 900');
 });
});
