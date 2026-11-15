import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {describe,it,expect,vi,beforeEach,afterEach} from 'vitest';

const rpc=vi.hoisted(()=>vi.fn());
vi.mock('@/integrations/supabase/client',()=>({supabase:{rpc}}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:{id:'u1'}})}));

import {FrontendModulesProvider,useFrontendModules} from '../useFrontendModules';

let seen:{loading:boolean;error:boolean;ok:boolean}[]=[];
function Probe(){const m=useFrontendModules();seen.push({loading:m.loading,error:m.error,ok:m.canAccess('chat')});return null;}
const last=()=>seen[seen.length-1];

describe('Module policy loading',()=>{
 beforeEach(()=>{vi.useFakeTimers();seen=[];rpc.mockReset();(globalThis as {IS_REACT_ACT_ENVIRONMENT?:boolean}).IS_REACT_ACT_ENVIRONMENT=true;});
 afterEach(()=>vi.useRealTimers());
 it('retries twice without showing an error, and recovers',async()=>{
  rpc.mockRejectedValueOnce(Error('x')).mockRejectedValueOnce(Error('x')).mockResolvedValue({data:[{module_key:'chat',visible:true,access_enabled:true,automation_enabled:false}],error:null});
  const root=createRoot(document.createElement('div'));
  await act(async()=>{root.render(<FrontendModulesProvider><Probe/></FrontendModulesProvider>);});
  expect(seen.some(s=>s.error)).toBe(false);
  expect(last().ok).toBe(false);
  await act(async()=>{await vi.advanceTimersByTimeAsync(3000);});
  await act(async()=>{await vi.advanceTimersByTimeAsync(3000);});
  expect(last()).toMatchObject({loading:false,error:false,ok:true});
 });
 it('shows the error after repeated failures and keeps access denied',async()=>{
  rpc.mockRejectedValue(Error('x'));
  const root=createRoot(document.createElement('div'));
  await act(async()=>{root.render(<FrontendModulesProvider><Probe/></FrontendModulesProvider>);});
  for(let i=0;i<3;i++)await act(async()=>{await vi.advanceTimersByTimeAsync(3000);});
  expect(last()).toMatchObject({loading:false,error:true,ok:false});
 });
});
