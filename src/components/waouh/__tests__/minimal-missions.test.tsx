import React,{act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({user:{id:'owner-a'},list:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>{const c={on:()=>c,subscribe:()=>c};return {supabase:{channel:()=>c,removeChannel:vi.fn()}};});
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:mocks.user})}));
vi.mock('@/lib/waouh/nexus',()=>({listNexusMandates:mocks.list,listNexusOpportunityJourneys:async()=>({journeys:[]}),updateNexusMandate:vi.fn()}));
vi.mock('@/lib/waouh/agenticClient',()=>({invokeWaouhAgentic:async()=>({missions:[],approvals:[]})}));
vi.mock('@/lib/waouh/avatarAutonomy',()=>({loadAvatarAutonomy:async()=>({paused:false})}));
vi.mock('../bot/BotLiveAvatar',()=>({BotLiveAvatar:()=> <span>Bot</span>}));
vi.mock('../WaouhAgentCenter',()=>({WaouhAgentCenter:()=>null}));
vi.mock('../WaouhContactLedger',()=>({WaouhContactLedger:()=>null}));
vi.mock('../WaouhConvergenceWorkspace',()=>({WaouhConvergenceDialog:()=>null}));
vi.mock('../WaouhJourneyProgress',()=>({WaouhJourneyProgress:()=>null}));
import Page from '@/pages/waouh/WaouhMissionsPage';
let host:HTMLDivElement,root:Root;
beforeEach(()=>{globalThis.IS_REACT_ACT_ENVIRONMENT=true;Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});host=document.createElement('div');document.body.append(host);root=createRoot(host);mocks.user={id:'owner-a'};});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.clearAllMocks();});
it('ignores the previous account response after a change of account',async()=>{
 let oldResponse!:(v:unknown)=>void;mocks.list.mockImplementationOnce(()=>new Promise(r=>oldResponse=r)).mockResolvedValue({mandates:[{id:'b',goal:'Besoin du compte B',status:'active',metadata:{},created_at:'2026-10-27T08:00:00Z'}]});
 await act(async()=>root.render(<MemoryRouter><Page/></MemoryRouter>));mocks.user={id:'owner-b'};
 await act(async()=>root.render(<MemoryRouter><Page/></MemoryRouter>));
 await act(async()=>oldResponse({mandates:[{id:'a',goal:'Besoin privé du compte A',status:'active',metadata:{}}]}));
 expect(host.textContent).toContain('Besoin du compte B');expect(host.textContent).not.toContain('Besoin privé du compte A');expect(host.querySelectorAll('h1')).toHaveLength(1);expect(host.textContent).not.toContain('NEXUS');
});

it('preserves loaded missions and retries a failed refresh automatically',async()=>{
 vi.useFakeTimers();
 mocks.list.mockResolvedValueOnce({mandates:[{id:'m',goal:'Mon produit suivi',status:'active',created_at:'2026-10-28T08:00:00Z',metadata:{}}]}).mockRejectedValueOnce(new Error('offline')).mockResolvedValue({mandates:[{id:'m',goal:'Mon produit suivi',status:'active',created_at:'2026-10-28T08:00:00Z',metadata:{}}]});
 await act(async()=>root.render(<MemoryRouter><Page/></MemoryRouter>));
 await act(async()=>{window.dispatchEvent(new Event('focus'));});
 expect(host.textContent).toContain('Mon produit suivi');expect(host.textContent).toContain('Je rétablis le suivi automatiquement');
 await act(async()=>{await vi.advanceTimersByTimeAsync(5000);});
 expect(mocks.list).toHaveBeenCalledTimes(3);expect(host.textContent).toContain('Mon produit suivi');expect(host.textContent).not.toContain('Je rétablis le suivi automatiquement');
 vi.useRealTimers();
});
