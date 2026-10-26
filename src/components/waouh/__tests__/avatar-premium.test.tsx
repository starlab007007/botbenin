import React,{act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import {WaouhPremiumAvatar} from '../WaouhPremiumAvatar';
import {WaouhLiveMission} from '../WaouhLiveMission';
import {WaouhAutonomySettings} from '../WaouhAutonomySettings';
import {DEFAULT_AVATAR_AUTONOMY} from '@/lib/waouh/avatarAutonomy';
const mocks=vi.hoisted(()=>({load:vi.fn(),save:vi.fn()}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:{id:'owner'}})}));
vi.mock('../bot/BotLiveAvatar',()=>({BotLiveAvatar:({size}:{size:number})=><div data-avatar-size={size}/> }));
vi.mock('@/lib/waouh/avatarAutonomy',async()=>{const actual=await vi.importActual('@/lib/waouh/avatarAutonomy');return {...actual,loadAvatarAutonomy:mocks.load,saveAvatarAutonomy:mocks.save};});
let host:HTMLDivElement,root:Root;
beforeEach(()=>{globalThis.IS_REACT_ACT_ENVIRONMENT=true;host=document.createElement('div');document.body.append(host);root=createRoot(host);mocks.load.mockResolvedValue({...DEFAULT_AVATAR_AUTONOMY});mocks.save.mockResolvedValue({...DEFAULT_AVATAR_AUTONOMY});});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.clearAllMocks();});
describe('Approved Avatar screens',()=>{
  it('places one greeting below the 84px avatar and retains all four actual actions',async()=>{
    const action=vi.fn();await act(async()=>root.render(<WaouhPremiumAvatar firstName="Songbian Zime" deals={1} onAction={action} onAsk={()=>{}} onSettings={()=>{}} onMissions={()=>{}}/>));
    const portrait=host.querySelector('[data-avatar-size="84"]')!,greeting=host.querySelector('.wap-greeting')!;
    expect(portrait.compareDocumentPosition(greeting)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(host.textContent).toContain('Bonjour Songbian');expect(host.textContent).toContain('1 échange en cours');
    for(const button of host.querySelectorAll('.wap-action'))await act(async()=>button.dispatchEvent(new MouseEvent('click',{bubbles:true})));
    expect(action.mock.calls.map(c=>c[0])).toEqual(['acheter','vendre','trouver','demander']);
    expect(host.textContent).not.toContain('Je cherche, compare et négocie');
  });
  it('exposes observed events on demand and keeps pause tied to the request lifecycle',async()=>{
    const pause=vi.fn();await act(async()=>root.render(<WaouhLiveMission busy count={2} events={[{id:1,at:'2026-10-26T10:00:00Z',text:'Premières offres reçues.'}]} onPause={pause}/>));
    expect(host.querySelector('ol')).toBeNull();
    await act(async()=>(host.querySelector('[aria-expanded]') as HTMLButtonElement).click());
    expect(host.querySelector('ol')?.textContent).toContain('Premières offres reçues.');
    await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent?.includes('Mettre en pause'))!.click());expect(pause).toHaveBeenCalledOnce();
  });
  it('awaits server persistence and does not claim a failed save succeeded',async()=>{
    mocks.save.mockRejectedValueOnce(new Error('failure'));
    await act(async()=>root.render(<WaouhAutonomySettings/>));
    await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent?.includes('Enregistrer mes règles'))!.click());
    expect(mocks.save).toHaveBeenCalledWith(DEFAULT_AVATAR_AUTONOMY);
    expect(host.querySelector('[role=alert]')?.textContent).toContain('Enregistrement impossible');
    expect(host.textContent).not.toContain('Vos règles sont enregistrées sur votre compte.');
  });
});
