import React,{act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
const mock=vi.hoisted(()=>({invoke:vi.fn(),success:vi.fn(),error:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{functions:{invoke:mock.invoke}}}));
vi.mock('sonner',()=>({toast:{success:mock.success,error:mock.error}}));
import Panel from '../WaouhSourceCatalogPanel';
let host:HTMLDivElement,root:Root;
const platform={platform_key:'bj.bambaad.com',hostname:'bj.bambaad.com',label:'BambaAd',access_state:'authorized',transport:'direct',adapter_key:'classifieds',engine_key:'cheerio',rights_reference:'Fixture access reference',attribution:'BambaAd',media_authorized:false,media_hosts:[],discovery_minutes:360,recheck_minutes:1440,daily_page_limit:100};
const snapshot={ok:true,platforms:[platform],entries:[{entry_no:3,platform_key:platform.platform_key,label:'BambaAd',url:'https://bj.bambaad.com/',alias_of:null,target_id:null,test_status:null,test_at:null},{entry_no:40,platform_key:platform.platform_key,label:'BambaAd services',alias_of:3}],documents:[],indexed_documents:1724};
beforeEach(()=>{vi.clearAllMocks();globalThis.IS_REACT_ACT_ENVIRONMENT=true;host=document.createElement('div');document.body.append(host);root=createRoot(host);});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();});
it('keeps aliases shared and connection disabled until the extraction test passes',async()=>{
 mock.invoke.mockResolvedValue({data:snapshot});await act(async()=>root.render(<Panel/>));
 expect(host.textContent).toContain('1724 fiches');expect(host.textContent).toContain('Même source que l’entrée 3');
 expect([...host.querySelectorAll('button')].find(b=>b.textContent==='Raccorder / reprendre')?.disabled).toBe(true);
 await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent==='Tester l’extraction')!.click());
 expect(mock.invoke).toHaveBeenCalledWith('waouh-radar-site-scraper',{body:{action:'collection.catalog.test',entry_no:3}});
});
it('uses the indexed search gateway and supports pagination',async()=>{
 mock.invoke.mockImplementation((_fn,options)=>Promise.resolve({data:options.body.action==='collection.catalog.search'?{ok:true,records:[],total:42,next_offset:20}:snapshot}));
 await act(async()=>root.render(<Panel/>));
 await act(async()=>host.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
 expect(host.textContent).toContain('42 fiches correspondantes');
 await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent==='Suivante')!.click());
 expect(mock.invoke).toHaveBeenCalledWith('waouh-radar-site-scraper',{body:{action:'collection.catalog.search',query:'',offset:20}});
});
it('reports an administrator access failure instead of an empty healthy catalog',async()=>{
 mock.invoke.mockResolvedValue({error:new Error('forbidden')});await act(async()=>root.render(<Panel/>));
 expect(host.querySelector('[role="alert"]')).not.toBeNull();expect(host.querySelector('select')).toBeNull();
});
it('does not save an address when it merely loses focus',async()=>{
 mock.invoke.mockResolvedValue({data:snapshot});await act(async()=>root.render(<Panel/>));
 const input=host.querySelector('[aria-label="URL de collecte 3"]') as HTMLInputElement;
 const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!;
 await act(async()=>{set.call(input,'https://bj.bambaad.com/annonces');input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));input.dispatchEvent(new FocusEvent('focusout',{bubbles:true}));});
 expect(mock.invoke).toHaveBeenCalledTimes(1);
 await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent==='Enregistrer l’adresse')!.click());
 expect(mock.invoke).toHaveBeenCalledWith('waouh-radar-site-scraper',{body:{action:'collection.catalog.url',entry_no:3,url:'https://bj.bambaad.com/annonces'}});
});
it('blocks connection after an expired test even when a target is already linked',async()=>{
 mock.invoke.mockResolvedValue({data:{...snapshot,entries:[{...snapshot.entries[0],target_id:'old-target',test_status:'passed',test_at:'2000-01-01'}]}});
 await act(async()=>root.render(<Panel/>));
 expect([...host.querySelectorAll('button')].find(b=>b.textContent?.includes('Raccorder / reprendre'))?.disabled).toBe(true);
 expect(host.textContent).toContain('à renouveler');
});
