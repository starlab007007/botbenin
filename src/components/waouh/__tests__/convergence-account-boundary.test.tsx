import React,{act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({account:{id:'account-a'} as {id:string}|null,api:vi.fn()}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:state.account})}));
vi.mock('@/lib/waouh/convergence',async original=>({...await original<typeof import('@/lib/waouh/convergence')>(),convergence:state.api}));
import {WaouhConvergenceWorkspace} from '../WaouhConvergenceWorkspace';
let host:HTMLDivElement,root:Root;
const render=async()=>{await act(async()=>root.render(<MemoryRouter><WaouhConvergenceWorkspace/></MemoryRouter>));};
beforeEach(()=>{globalThis.IS_REACT_ACT_ENVIRONMENT=true;host=document.createElement('div');document.body.append(host);root=createRoot(host);localStorage.clear();state.account={id:'account-a'};state.api.mockReset();});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();localStorage.clear();});
describe('Convergence account boundary',()=>{
 it('does not show a previous account’s late response or overwrite the next account’s draft',async()=>{
  const draft=(goal:string)=>({goal,city:'Cotonou',kind:'service',budget:'',landmark:'',deadline:'',criteria:''});
  localStorage.setItem('waouh.convergence.draft.account-a',JSON.stringify(draft('Besoin privé A')));
  localStorage.setItem('waouh.convergence.draft.account-b',JSON.stringify(draft('Besoin privé B')));
  let resolveA:(v:any)=>void=()=>{};
  state.api.mockImplementation(()=>state.account?.id==='account-a'?new Promise(r=>{resolveA=r;}):Promise.resolve({missions:[]}));
  await render();expect(host.querySelector('textarea')?.value).toBe('Besoin privé A');
  state.account={id:'account-b'};await render();
  await act(async()=>resolveA({missions:[{id:'old',goal:'Mission secrète A',city:'Cotonou',status:'draft'}]}));
  expect(host.textContent).not.toContain('Mission secrète A');expect(host.querySelector('textarea')?.value).toBe('Besoin privé B');
  expect(JSON.parse(localStorage.getItem('waouh.convergence.draft.account-b')!).goal).toBe('Besoin privé B');
 });
 it('shows a recoverable error and keeps the saved need when the service is unavailable',async()=>{
  localStorage.setItem('waouh.convergence.draft.account-a',JSON.stringify({goal:'Réparer une fuite',city:'Cotonou',kind:'service',budget:'10000',landmark:'',deadline:'',criteria:''}));
  state.api.mockRejectedValue(new Error('Connexion indisponible. Réessayez.'));await render();
  expect(host.querySelector('[role="alert"]')?.textContent).toContain('Réessayez');
  expect(host.querySelector('textarea')?.value).toBe('Réparer une fuite');
 });
});
