import React,{act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({invoke:vi.fn(),success:vi.fn(),error:vi.fn(),loading:vi.fn(),dismiss:vi.fn()}));
vi.mock('sonner',()=>({toast:mocks}));
vi.mock('../RadarApiConfigPanel',()=>({default:()=>null}));
vi.mock('@/components/admin/RadarAutoControlPanel',()=>({default:()=>null}));
vi.mock('@/integrations/supabase/client',()=>{
 const channel={on:()=>channel,subscribe:()=>channel};
 const chain=(data:unknown)=>{const q:any={select:()=>q,order:()=>q,limit:()=>q,then:(ok:any,no:any)=>Promise.resolve({data,error:null}).then(ok,no)};return q;};
 return {supabase:{from:(table:string)=>chain(table==='waouh_radar_sources'?[{id:'source-1',type:'site',identifier:'https://school.bj/feed/',label:'Bourses',active:true,scan_freq_min:720,last_scan_at:null,last_signal_count:2,config:{collection_format:'rss_atom',collection_transport:'direct',collection_status:'live'}}]:[]),functions:{invoke:mocks.invoke},channel:()=>channel,removeChannel:vi.fn()}};
});
import WaouhRadarTab from '../WaouhRadarTab';
let host:HTMLDivElement,root:Root;
beforeEach(()=>{vi.clearAllMocks();globalThis.IS_REACT_ACT_ENVIRONMENT=true;host=document.createElement('div');document.body.append(host);root=createRoot(host);});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();});
async function collect(){
 await act(async()=>root.render(<WaouhRadarTab/>));
 await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent==='Collecte gratuite')!.click());
}
it('queues the free collector and reports pending publication rather than completed analysis',async()=>{
 mocks.invoke.mockResolvedValue({data:{ok:true,scheduled:2},error:null});
 await collect();
 expect(mocks.invoke).toHaveBeenCalledWith('waouh-radar-site-scraper',{body:{}});
 expect(mocks.success).toHaveBeenCalledWith(expect.stringContaining('mises en file'));
 expect(mocks.success.mock.calls.flat().join(' ')).not.toContain('Analyse terminée');
 expect(host.querySelector('a[href="/admin/waouh/data-control"]')).not.toBeNull();
});
it('does not announce success when the worker rejects the collection request',async()=>{
 mocks.invoke.mockResolvedValue({data:{ok:false},error:null});await collect();
 expect(mocks.error).toHaveBeenCalledOnce();expect(mocks.success).not.toHaveBeenCalled();
});
it('explains that a zero schedule keeps the existing collection cadence',async()=>{
 mocks.invoke.mockResolvedValue({data:{ok:true,scheduled:0},error:null});await collect();
 expect(mocks.success).toHaveBeenCalledWith(expect.stringContaining('Aucune source arrivée à échéance'));
});
