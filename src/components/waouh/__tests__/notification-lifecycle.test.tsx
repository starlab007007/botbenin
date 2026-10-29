import React,{act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {useWaouhMatchNotifications} from '@/hooks/useWaouhMatchNotifications';
const mocks=vi.hoisted(()=>({identity:vi.fn(),channel:vi.fn(),remove:vi.fn(),on:vi.fn(),subscribe:vi.fn()}));
vi.mock('@/lib/waouh/identityIds',()=>({fetchAuthIdentityIds:mocks.identity}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{
 channel:mocks.channel,removeChannel:mocks.remove,
 from:()=>{const query:any={then:(done:any)=>Promise.resolve({data:[],error:null}).then(done)};for(const key of ['select','or','order','limit','eq','update','in'])query[key]=()=>query;return query;},
}}));
vi.mock('sonner',()=>({toast:Object.assign(vi.fn(),{success:vi.fn()})}));
let host:HTMLDivElement,root:Root,unmounted:boolean;
function Screen(){useWaouhMatchNotifications('browser-session','owner-a');return null;}
beforeEach(()=>{
 vi.clearAllMocks();globalThis.IS_REACT_ACT_ENVIRONMENT=true;host=document.createElement('div');document.body.append(host);root=createRoot(host);unmounted=false;
 const channel={on:mocks.on,subscribe:mocks.subscribe};mocks.channel.mockReturnValue(channel);mocks.on.mockReturnValue(channel);mocks.subscribe.mockReturnValue(channel);
});
afterEach(async()=>{if(!unmounted)await act(async()=>root.unmount());host.remove();});
it('does not leak channels when an identity lookup finishes after navigation',async()=>{
 let finish!:(v:string[])=>void;mocks.identity.mockReturnValue(new Promise(r=>{finish=r;}));
 await act(async()=>root.render(<Screen/>));
 await act(async()=>root.unmount());unmounted=true;
 await act(async()=>finish(['identity-a']));
 expect(mocks.subscribe).not.toHaveBeenCalled();
});
it('uses one scoped channel for many device identities and removes it on exit',async()=>{
 mocks.identity.mockResolvedValue(Array.from({length:50},(_,i)=>'identity-'+i));
 await act(async()=>root.render(<Screen/>));
 expect(mocks.channel).toHaveBeenCalledTimes(1);expect(mocks.subscribe).toHaveBeenCalledTimes(1);
 expect(mocks.on).toHaveBeenCalledTimes(2);
 expect(mocks.on.mock.calls.map(c=>c[1].filter).join(' ')).not.toContain('web_session_id');
 await act(async()=>root.unmount());unmounted=true;expect(mocks.remove).toHaveBeenCalledTimes(1);
});
