import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {it,expect,vi} from 'vitest';
const mock=vi.hoisted(()=>({invoke:vi.fn(),rpc:vi.fn(),from:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{functions:{invoke:mock.invoke},rpc:mock.rpc,from:mock.from}}));
vi.mock('@/hooks/use-toast',()=>({useToast:()=>({toast:vi.fn()})}));
import Page from '../AdminWaouhDataControlPage';
it('opens the lightweight overview first and preserves the source workspace during navigation',async()=>{
 globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 const collection={counts:{usable:1},checked_at:new Date().toISOString(),quality:{sample_size:1,complete:1,missing_photo:0,missing_price:0,missing_contact:0},targets:[],jobs:[],policies:[]};
 const catalog={platforms:[],entries:[],documents:[],indexed_documents:1};
 mock.invoke.mockImplementation((_fn,{body})=>Promise.resolve({data:{ok:true,...(body.action==='collection.overview'?collection:body.action==='collection.catalog.overview'?catalog:body.action==='search_health'?{by_kind:{purchase:{total:2,found:1,widened:0}},sources_down:[],sources_total:1}:{engines:[]})}}));
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 try{
  await act(async()=>root.render(<Page/>));
  expect(host.querySelector('h1')?.textContent).toBe('Centre de collecte');
  expect(host.textContent).toContain('50 % · 1/2');
  expect(mock.invoke).toHaveBeenCalledTimes(4);expect(mock.rpc).not.toHaveBeenCalled();expect(mock.from).not.toHaveBeenCalled();
  const tab=(name:string)=>[...host.querySelectorAll('[role=tab]')].find(t=>t.textContent===name)!;
  await act(async()=>tab('Sources').dispatchEvent(new MouseEvent('mousedown',{bubbles:true,button:0,ctrlKey:false})));
  expect(mock.invoke).toHaveBeenCalledTimes(4);
  await act(async()=>tab('Vue d’ensemble').dispatchEvent(new MouseEvent('mousedown',{bubbles:true,button:0,ctrlKey:false})));
  expect(mock.invoke).toHaveBeenCalledTimes(4);
 }finally{await act(async()=>root.unmount());host.remove();}
});
