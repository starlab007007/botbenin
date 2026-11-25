import React,{act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {CollectionControlProvider,useCollectionControl,useCollectionResource} from '../collection/CollectionControlContext';
import WaouhCollectionOverview from '../collection/WaouhCollectionOverview';
const mock=vi.hoisted(()=>({invoke:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{functions:{invoke:mock.invoke}}}));
let host:HTMLDivElement,root:Root;
const collection={counts:{usable:20},checked_at:'2026-11-25T09:00:00Z',quality:{sample_size:10,complete:5,missing_photo:3,missing_price:2,missing_contact:1},targets:[{id:'t',enabled:false}],jobs:[],policies:[{provider:'apify',estimated_daily_cost_limit:.2,cost_currency:'USD'}],usage:[{provider:'apify',estimated_cost:.2}]};
const catalog={indexed_documents:20,platforms:[{platform_key:'coin',label:'CoinAfrique',adapter_key:'coinafrique',access_state:'review'}],entries:[{platform_key:'coin',test_status:'failed',test_report:{reason:'provider_quota_exhausted'}}]};
function Companion(){const r=useCollectionResource('catalog'),c=useCollectionControl()!;return <><span>{r.error}</span><button onClick={()=>void c.refresh('catalog')}>Relire le registre</button></>;}
beforeEach(()=>{vi.clearAllMocks();globalThis.IS_REACT_ACT_ENVIRONMENT=true;host=document.createElement('div');document.body.append(host);root=createRoot(host);});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.useRealTimers();});
const setup=()=>mock.invoke.mockImplementation((_fn,{body})=>Promise.resolve({data:{ok:true,...(body.action==='collection.overview'?collection:body.action==='collection.catalog.overview'?catalog:{engines:[]})}}));
it('shares exactly three read-only requests and opens the relevant source from guidance',async()=>{
 setup();const navigate=vi.fn();await act(async()=>root.render(<CollectionControlProvider><WaouhCollectionOverview onNavigate={navigate}/><Companion/></CollectionControlProvider>));
 expect(mock.invoke).toHaveBeenCalledTimes(3);expect(mock.invoke.mock.calls.every(c=>c[1].body.action.endsWith('overview'))).toBe(true);
 expect(host.textContent).toContain('0.20 USD réservés');expect(host.textContent).toContain('50');
 await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent==='Voir la source')!.click());
 expect(navigate).toHaveBeenCalledWith('platforms','coin','policies');
});
it('keeps previously loaded data and announces a partial refresh failure',async()=>{
 setup();await act(async()=>root.render(<CollectionControlProvider><WaouhCollectionOverview onNavigate={()=>{}}/><Companion/></CollectionControlProvider>));
 mock.invoke.mockResolvedValueOnce({error:new Error('backend secret')});
 await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent==='Relire le registre')!.click());
 expect(host.textContent).toContain('Données partielles');expect(host.querySelector('[role=alert]')).not.toBeNull();expect(host.textContent).toContain('CoinAfrique');expect(host.textContent).not.toContain('backend secret');
});
it('polls only read endpoints and skips background tabs',async()=>{
 vi.useFakeTimers();setup();await act(async()=>root.render(<CollectionControlProvider><Companion/></CollectionControlProvider>));
 Object.defineProperty(document,'hidden',{configurable:true,value:true});
 await act(async()=>vi.advanceTimersByTime(60000));expect(mock.invoke).toHaveBeenCalledTimes(3);
 Object.defineProperty(document,'hidden',{configurable:true,value:false});
 await act(async()=>vi.advanceTimersByTime(60000));expect(mock.invoke).toHaveBeenCalledTimes(6);expect(mock.invoke.mock.calls.every(c=>c[1].body.action.endsWith('overview'))).toBe(true);
});
