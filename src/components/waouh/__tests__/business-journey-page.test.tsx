import {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {Simulate} from 'react-dom/test-utils';
import {MemoryRouter} from 'react-router-dom';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
const {call}=vi.hoisted(()=>({call:vi.fn()}));
vi.mock('@/lib/waouh/convergence',()=>({convergence:call}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:{id:'owner'}})}));
vi.mock('@/components/waouh/bot/BotLiveAvatar',()=>({BotLiveAvatar:()=> <span>Bot</span>}));
import Page from '@/pages/waouh/WaouhPremiumJourneyPage';
let host:HTMLDivElement,root:Root;
const bundle={mission:{id:'00000000-0000-4000-8000-000000000001',kind:'product',goal:'Téléphone',city:'Cotonou',criteria:[]},components:[],plans:[],messages:[],evidence:[],is_owner:true};
beforeEach(()=>{globalThis.IS_REACT_ACT_ENVIRONMENT=true;call.mockReset();call.mockImplementation(async(action)=>action==='list'?{missions:[]}:bundle);host=document.createElement('div');document.body.append(host);root=createRoot(host);});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();});
async function input(el:HTMLInputElement,value:string){await act(async()=>{el.value=value;Simulate.change(el);});}
it('creates the first real mission without sending empty identifiers',async()=>{
 await act(async()=>root.render(<MemoryRouter><Page/></MemoryRouter>));
 const fields=host.querySelectorAll('input');await input(fields[0],'Téléphone');await input(fields[1],'Cotonou');
 await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent?.includes('Commencer'))!.click());
 const payload=call.mock.calls.find(c=>c[0]==='create')![1];expect(payload).not.toHaveProperty('mission_id');expect(payload).not.toHaveProperty('component_id');expect(payload.goal).toBe('Téléphone');
 expect(call.mock.calls.some(c=>c[0]==='business.get'&&c[1].mission_id===bundle.mission.id)).toBe(true);
});
it('redeems an invitation without attaching an empty mission reference',async()=>{
 await act(async()=>root.render(<MemoryRouter><Page/></MemoryRouter>));
 await input(host.querySelector('input[aria-label="Code d’invitation"]')!,'a'.repeat(64));
 await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent?.includes('Continuer par code'))!.click());
 const payload=call.mock.calls.find(c=>c[0]==='redeem_invite')![1];expect(payload).not.toHaveProperty('mission_id');expect(payload.token).toBe('a'.repeat(64));
});
