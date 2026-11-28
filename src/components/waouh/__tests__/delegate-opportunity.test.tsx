import React,{act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';

const calls=vi.hoisted(()=>[] as Array<[string,Record<string,unknown>]>);
vi.mock('@/integrations/supabase/client',()=>({supabase:{auth:{getSession:async()=>({data:{session:{user:{id:'owner'}}}})}}}));
vi.mock('@/lib/waouh/dealRoom',async()=>{const actual=await vi.importActual<object>('@/lib/waouh/dealRoom');return {...actual,roomCall:async(action:string,payload:Record<string,unknown>)=>{calls.push([action,payload]);return action==='open'?{deal_room_id:'room-1',mandate_revision:0}:{};}};});
vi.mock('@/components/waouh/WaouhBotFollowUp',()=>({WaouhBotFollowUp:()=><p>suivi</p>}));

import {WaouhDelegateButton} from '../WaouhDelegateButton';

let host:HTMLDivElement,root:Root;
beforeEach(()=>{(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;calls.length=0;host=document.createElement('div');document.body.append(host);root=createRoot(host);});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();});
const press=async(text:string)=>act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent?.includes(text))!.click());
const type=async(value:string)=>act(async()=>{const t=host.querySelector('textarea')!;const set=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value')!.set!;set.call(t,value);t.dispatchEvent(new Event('input',{bubbles:true}));});

describe('Confier une opportunité à Bot',()=>{
  it('requires a short application, then hands it to Bot with no price ceiling',async()=>{
    await act(async()=>root.render(<MemoryRouter><WaouhDelegateButton result={{fabric_id:'article:job',title:'Assistant administratif'}} mode="ask" discoveryKind="opportunity" label="Bot"/></MemoryRouter>));
    await press('Bot');
    expect(host.textContent).toContain('Transmet votre candidature');
    expect(host.textContent).toContain('Vous êtes prévenu à chaque étape.');
    expect(host.textContent).not.toContain('Prix maximum');
    await press('Confirmer le mandat');
    expect(host.querySelector('[role=alert]')?.textContent).toContain('30 caractères');
    expect(calls).toHaveLength(0);
    const summary='Licence en gestion, 3 ans en secrétariat, disponible immédiatement à Cotonou.';
    await type(summary);
    await press('Confirmer le mandat');
    const delegate=calls.find(([a])=>a==='delegate')![1] as {rules:Record<string,unknown>};
    expect(delegate.rules).toMatchObject({strategy:'opportunity',budget_max:null,application:{summary}});
  });
});
