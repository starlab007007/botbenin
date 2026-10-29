import React,{act,StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {it,expect,vi} from 'vitest';
import {useMobileProfile} from '@/app-mobile/hooks/useMobileProfile';
const mocks=vi.hoisted(()=>({channels:new Map<string,any>(),user:{id:'owner-a',email:'fixture@example.invalid',user_metadata:{}}}));
vi.mock('@/app-mobile/hooks/useMobileAuth',()=>({useMobileAuth:()=>({user:mocks.user})}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{
 from:()=>{const q:any={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:{id:'owner-a',full_name:'Profil'},error:null})};return q;},
 channel:(name:string)=>{
  if(mocks.channels.has(name))return mocks.channels.get(name);
  const c={name,subscribed:false,on:()=>{if(c.subscribed)throw Error('cannot add postgres_changes after subscribe');return c;},subscribe:()=>{c.subscribed=true;return c;}};
  mocks.channels.set(name,c);return c;
 },
 removeChannel:async(c:any)=>{await Promise.resolve();mocks.channels.delete(c.name);},
}}));
function Profile(){const {profile}=useMobileProfile();return <span>{profile?.full_name}</span>;}
it('supports the desktop shell and page profile simultaneously, including strict remounts',async()=>{
 globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 try{
  await act(async()=>root.render(<StrictMode><Profile/><Profile/></StrictMode>));
  expect(host.textContent).toBe('ProfilProfil');
  expect(mocks.channels.size).toBe(2);
 }finally{await act(async()=>root.unmount());host.remove();}
 expect(mocks.channels.size).toBe(0);
});
