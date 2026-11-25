import React,{act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
const mock=vi.hoisted(()=>({invoke:vi.fn(),success:vi.fn(),error:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{functions:{invoke:mock.invoke}}}));
vi.mock('sonner',()=>({toast:{success:mock.success,error:mock.error}}));
import Panel from '../WaouhCollectionEnginesPanel';
let host:HTMLDivElement,root:Root;
const snapshot={ok:true,engines:[{engine_key:'scrapy',enabled:true,timeout_seconds:20,max_document_kb:1200,installed_version:null,last_check_status:null,last_test_status:null,checked_at:null,last_test_at:null}],targets:[],runs:[]};
beforeEach(()=>{vi.clearAllMocks();globalThis.IS_REACT_ACT_ENVIRONMENT=true;host=document.createElement('div');document.body.append(host);root=createRoot(host);});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();});
it('shows unknown installation honestly and tests only the fixed demo',async()=>{
 mock.invoke.mockImplementation((_fn,options)=>Promise.resolve({data:options.body.action==='collection.engine.test'?{ok:true,passed:true,published:0,records:1}:snapshot}));
 await act(async()=>root.render(<Panel/>));
 expect(host.textContent).toContain('Installation : à vérifier');
 const button=[...host.querySelectorAll('button')].find(x=>x.textContent==='Tester Scrapy')!;
 await act(async()=>button.click());
 expect(mock.invoke).toHaveBeenCalledWith('waouh-radar-site-scraper',{body:{action:'collection.engine.test',engine_key:'scrapy'}});
 expect(mock.success).toHaveBeenCalledWith(expect.stringContaining('aucune publication'));
});
it('a failed installation check never claims success',async()=>{
 mock.invoke.mockImplementation((_fn,options)=>Promise.resolve({data:options.body.action==='collection.engine.check'?{ok:true,available:false}:snapshot}));
 await act(async()=>root.render(<Panel/>));
 await act(async()=>[...host.querySelectorAll('button')].find(x=>x.textContent==='Vérifier l’installation')!.click());
 expect(mock.error).toHaveBeenCalledWith(expect.stringContaining('ne répond pas'));
 expect(mock.success).not.toHaveBeenCalled();
});
it('refuses to display empty healthy cards after access denial',async()=>{
 mock.invoke.mockResolvedValue({error:new Error('forbidden')});
 await act(async()=>root.render(<Panel/>));
 expect(host.querySelector('[role=alert]')?.textContent).toContain('indisponible');
 expect(host.querySelector('section')).toBeNull();
});
