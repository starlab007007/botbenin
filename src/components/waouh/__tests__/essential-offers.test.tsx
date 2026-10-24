import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WaouhEssentialOffers } from '../WaouhEssentialOffers';
import { uniqueOffers, knownPeopleCount, offerHint, offerMarket, offerPrice, offerPrimaryNeedsPrice } from '@/lib/waouh/essentialOffers';
import type { NexusDiscoveryResult } from '@/lib/waouh/nexus';

const offer = (id: string, patch: Partial<NexusDiscoveryResult> = {}) => ({ fabric_id: id, subject: `Stylo ${id}`, source_key: 'waouh_app', intent: 'SELL', city: 'Cotonou', price_min: 100, currency: 'XOF', scores: { total_score: 88, reasons: ['Même zone'] }, contact_policy: { level: 'C0' }, ...patch } as NexusDiscoveryResult);
let host: HTMLDivElement, root: Root;
beforeEach(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; host = document.createElement('div'); document.body.append(host); root = createRoot(host); });
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });
const click = async (el: Element | null) => { expect(el).not.toBeNull(); await act(async () => (el as HTMLElement).click()); };
describe('Essential offers', () => {
  it('merges only known offer identities and never a shared title or masked phone', () => {
    const a = offer('article:a', { subject: 'Stylo Bic', evidence: { seller_user_id: 'seller-a', contact_last4: '4276' } });
    const b = offer('external:b', { subject: 'Stylo Bic', evidence: { seller_user_id: 'seller-b', contact_last4: '4276' } });
    const copy = offer('external:copy', { evidence: { article_id: 'a' } });
    const found = uniqueOffers([a,b,copy,a]); expect(found).toEqual([a,b]); expect(found[0]).toBe(a); expect(knownPeopleCount(found)).toBe(2);
  });
  it('requests services and announcement conditions without imposing a numeric price',()=>{expect(offerPrimaryNeedsPrice(offer('p'))).toBe(true);expect(offerPrimaryNeedsPrice(offer('s',{category:'service'}))).toBe(false);expect(offerPrimaryNeedsPrice(offer('a',{category:'annonce'}))).toBe(false);});
  it('keeps unknown units, currencies and price ranges explicit', () => {
    expect(offerHint(offer('a'))).toBe('Unité à confirmer'); expect(offerPrice(offer('b',{price_min:null}))).toBe('Prix à demander');
    expect(offerPrice(offer('c',{price_min:100,price_max:200,currency:'EUR'}))).toContain('100 EUR'); expect(offerPrice(offer('d',{price_min:0}))).toContain('0');
  });
  it('requires a known matching unit and two comparable documented sources', () => {
    const refs=Array.from({length:8},(_,i)=>({url:`https://example.com/${i}`,price:100+i*10,model:'Bic',unit:'pièce',comparable:true}));
    const item=offer('a',{model:'Bic',evidence:{market_references:refs}});
    expect(offerMarket(item).median).toBeNull(); expect(offerMarket(item).refs).toHaveLength(5);
    expect(offerMarket({...item,evidence:{...item.evidence,unit:'pièce'}}).median).toBe(120);
    expect(offerMarket({...item,evidence:{...item.evidence,unit:'lot'}}).median).toBeNull();
  });
  it('shows ten compact unique results and does not render scoring or details by default', async () => {
    const rows=Array.from({length:10},(_,i)=>offer(`article:${i}`,{evidence:{description:'UNIQUE_DETAIL'}}));
    await act(async()=>root.render(<WaouhEssentialOffers results={[...rows,rows[0]]} renderActions={()=>null}/>));
    expect(host.querySelectorAll('.we-card')).toHaveLength(10);expect(host.textContent).toContain('10 offres');
    expect(document.body.textContent).not.toMatch(/88%|UNIQUE_DETAIL|ENRICH|Pertinence/);
  });
  it('limits comparison to five, retains selections through filters and uses original action objects', async () => {
    const rows=Array.from({length:10},(_,i)=>offer(`article:${i}`,{city:i%2?'Porto-Novo':'Cotonou'}));
    const action=vi.fn();
    await act(async()=>root.render(<WaouhEssentialOffers results={rows} city="Cotonou" renderActions={r=><button data-testid="continue" onClick={()=>action(r)}>Je le veux</button>}/>));
    for(let i=0;i<5;i++)await click(host.querySelectorAll('.we-select')[i]);
    expect((host.querySelectorAll('.we-select')[5] as HTMLButtonElement).disabled).toBe(true);
    await click(host.querySelector('.we-list-heading button'));await click([...host.querySelectorAll('.we-filters button')].find(x=>x.textContent==='Proches')!);
    expect(host.querySelectorAll('.we-card')).toHaveLength(5);expect(host.querySelector('.we-compare-tray')?.textContent).toContain('5 / 5');
    await click(host.querySelectorAll('.we-card-open')[1]);await click(document.querySelector('[data-testid="continue"]'));expect(action).toHaveBeenCalledWith(rows[2]);
  });
  it('clears an opened offer and comparison selection on a new search', async()=>{
    const rows=[offer('a'),offer('b')];const render=async(results:NexusDiscoveryResult[])=>act(async()=>root.render(<WaouhEssentialOffers results={results} renderActions={()=>null}/>));
    await render(rows);await click(host.querySelector('.we-select'));await click(host.querySelector('.we-card-open'));
    expect(document.querySelector('.we-detail')).not.toBeNull();await render([offer('new')]);expect(document.querySelector('.we-detail')).toBeNull();expect(host.querySelector('.we-compare-tray')).toBeNull();
  });
});
