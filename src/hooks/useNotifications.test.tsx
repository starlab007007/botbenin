import React,{act}from'react';import{createRoot}from'react-dom/client';import{expect,it,vi}from'vitest';
(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
const mock=vi.hoisted(()=>({user:{id:'a'} as {id:string}|null,pending:[] as ((v:unknown)=>void)[],callbacks:[] as ((v:unknown)=>void)[]}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:mock.user})}));vi.mock('@/lib/waouh/resync',()=>({useWaouhResync:vi.fn()}));vi.mock('@/hooks/use-toast',()=>({toast:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:()=>({select(){return this;},eq(){return this;},order(){return this;},limit:()=>new Promise(resolve=>mock.pending.push(resolve))}),channel:()=>({on(_e:unknown,_o:unknown,cb:(v:unknown)=>void){mock.callbacks.push(cb);return this;},subscribe(){return this;}}),removeChannel:vi.fn()}}));
import{useNotifications}from'./useNotifications';
it('isolates alerts on logout/account change and discards late responses',async()=>{
 localStorage.setItem('notifications_backup',JSON.stringify([{id:'old-secret'}]));const result={current:null as ReturnType<typeof useNotifications>|null};function Harness(){result.current=useNotifications();return null;}
 const el=document.createElement('div');document.body.append(el);const root=createRoot(el);const render=()=>act(()=>root.render(<Harness/>));await render();
 await act(async()=>mock.pending.shift()!({data:[{id:'a-alert',read:false}],error:null}));expect(result.current.notifications[0].id).toBe('a-alert');void result.current.refetch();mock.user={id:'b'};await render();expect(result.current.notifications).toEqual([]);
 await act(async()=>{mock.pending.shift()!({data:[{id:'late-a'}],error:null});mock.callbacks[0]({new:{id:'old-realtime'}});});expect(result.current.notifications).toEqual([]);
 await act(async()=>mock.pending.shift()!({data:[{id:'b-alert',read:false}],error:null}));expect(result.current.notifications[0].id).toBe('b-alert');mock.user=null;await render();expect(result.current.notifications).toEqual([]);expect(result.current.unreadCount).toBe(0);expect(localStorage.getItem('notifications_backup')).toBeNull();await act(async()=>root.unmount());el.remove();
});
