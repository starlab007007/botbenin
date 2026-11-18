import React,{act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
const mock=vi.hoisted(()=>({invoke:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{functions:{invoke:mock.invoke}}}));
import RadarPublicSourceForm from '../RadarPublicSourceForm';
let host:HTMLDivElement,root:Root;
const source={id:'source-1',identifier:'https://t.me/s/market',config:{collection_format:'telegram_public',automation_authorized:true,attribution:'Publication originale',category:'Recrutement'}};
beforeEach(()=>{vi.clearAllMocks();globalThis.IS_REACT_ACT_ENVIRONMENT=true;host=document.createElement('div');document.body.append(host);root=createRoot(host);});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();});
it('saves the declared public template without granting activation or media rights',async()=>{
 const saved=vi.fn();mock.invoke.mockResolvedValue({data:{ok:true,updated:1}});
 await act(async()=>root.render(<RadarPublicSourceForm source={source} onSaved={saved}/>));
 await act(async()=>host.querySelector('button')!.click());
 expect(mock.invoke).toHaveBeenCalledWith('waouh-radar-site-scraper',{body:{action:'collection.source.configure',source_id:'source-1',url:'https://t.me/s/market',format:'telegram_public',category:'Recrutement',attribution:'Publication originale',authorized:true}});
 expect(saved).toHaveBeenCalledOnce();
});
it('retains the form and reports rejected source configuration',async()=>{
 const saved=vi.fn();mock.invoke.mockResolvedValue({error:new Error('rejected')});
 await act(async()=>root.render(<RadarPublicSourceForm source={source} onSaved={saved}/>));
 await act(async()=>host.querySelector('button')!.click());
 expect(host.querySelector('[role=alert]')).not.toBeNull();expect(saved).not.toHaveBeenCalled();
});
