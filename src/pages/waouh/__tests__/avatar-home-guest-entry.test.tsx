import React,{act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {MemoryRouter,Routes,Route,useLocation} from 'react-router-dom';
import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';

// Visitor on the public home: no account, no network.
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:null,isLoading:false})}));
vi.mock('@/app-mobile/hooks/useMobileProfile',()=>({useMobileProfile:()=>({profile:null})}));
vi.mock('@/components/waouh/bot/BotLiveAvatar',()=>({BotLiveAvatar:()=><div/>}));
vi.mock('@/components/waouh/WaouhSmartSale',()=>({WaouhSmartSale:()=><div data-smart-sale/>}));
vi.mock('@/integrations/supabase/client',()=>{
  const chain:any=new Proxy(()=>chain,{get:(_t,k)=>k==='then'?(r:(v:unknown)=>void)=>r({data:[],error:null,count:0}):chain});
  return {supabase:{from:()=>chain,rpc:()=>chain,functions:{invoke:async()=>({data:null,error:null})},channel:()=>({on:()=>({subscribe:()=>({})}),subscribe:()=>({})}),removeChannel:()=>{},auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}}};
});

import WaouhAvatarHomePage from '../WaouhAvatarHomePage';

function Where(){const l=useLocation();return <output data-where>{l.pathname}</output>;}
let host:HTMLDivElement,root:Root;
beforeEach(()=>{(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;host=document.createElement('div');document.body.append(host);root=createRoot(host);});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();document.body.innerHTML='';});

async function renderHome(){
  await act(async()=>root.render(<MemoryRouter initialEntries={['/']}><Routes><Route path="*" element={<><WaouhAvatarHomePage/><Where/></>}/></Routes></MemoryRouter>));
}
const click=async(kind:string)=>act(async()=>(host.querySelector(`[data-waouh-action="${kind}"]`) as HTMLButtonElement).click());

describe('Public home: a visitor keeps the chosen intent',()=>{
  it.each([['acheter','Acheter'],['trouver','Trouver'],['opportunite','Opportunit'],['service','Service'],['prestation','Prestation']])
  ('%s opens its own request sheet instead of a generic chat or a sign-in page',async(kind,title)=>{
    await renderHome();
    await click(kind);
    expect(host.querySelector('[data-where]')?.textContent).toBe('/');
    expect(document.body.querySelector('[role="dialog"]')?.textContent).toContain(title);
  });
  it('vendre keeps its dedicated sign-in route',async()=>{
    await renderHome();
    await click('vendre');
    expect(host.querySelector('[data-where]')?.textContent).toBe('/app/avatar/vendre');
  });
});
