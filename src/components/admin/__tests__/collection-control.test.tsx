import React,{act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
const mock=vi.hoisted(()=>({invoke:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{functions:{invoke:mock.invoke}}}));
import WaouhCollectionControlPanel from '../WaouhCollectionControlPanel';
let host:HTMLDivElement,root:Root;
beforeEach(()=>{vi.clearAllMocks();globalThis.IS_REACT_ACT_ENVIRONMENT=true;host=document.createElement('div');document.body.append(host);root=createRoot(host);});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();});
it('separates exact freshness counts from the bounded quality sample',async()=>{
 mock.invoke.mockResolvedValue({data:{ok:true,checked_at:'2026-11-18T00:00:00Z',counts:{usable:900,recent:100,old:799,undated:1,expired:30,added:20},quality:{sample_size:500,complete:90,missing_photo:300,missing_price:100,missing_contact:20},policies:[],targets:[],jobs:[]}});
 await act(async()=>root.render(<WaouhCollectionControlPanel/>));
 expect(host.textContent).toContain('Fiches exploitables900');
 expect(host.textContent).toContain('les 500 fiches');
 expect(host.textContent).toContain('Contrôle de plus de 7 jours799');
 expect(mock.invoke).toHaveBeenCalledWith('waouh-radar-site-scraper',{body:{action:'collection.overview'}});
});
it('shows unavailable data instead of zeros when access fails',async()=>{
 mock.invoke.mockResolvedValue({error:new Error('forbidden')});
 await act(async()=>root.render(<WaouhCollectionControlPanel/>));
 expect(host.querySelector('[role=alert]')?.textContent).toContain('indisponible');
 expect(host.textContent).not.toContain('Fiches exploitables');
});
