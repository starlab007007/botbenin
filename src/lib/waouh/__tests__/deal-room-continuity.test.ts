import {beforeEach,expect,it,vi} from 'vitest';
const api=vi.hoisted(()=>({user:'buyer',invoke:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{auth:{getSession:async()=>({data:{session:{user:{id:api.user},access_token:'test-session'}}})},functions:{invoke:api.invoke}}}));
import {roomCall} from '../dealRoom';
beforeEach(()=>{localStorage.clear();api.user='buyer';api.invoke.mockReset();});
it('reuses a persisted request after a lost response and removes it only after confirmation',async()=>{
 api.invoke.mockResolvedValueOnce({error:new Error('lost response'),data:null}).mockResolvedValueOnce({error:null,data:{ok:true,data:{deal_room_id:'room'}}});
 await expect(roomCall('message',{deal_room_id:'room',text:'Bonjour'})).rejects.toThrow();
 const first=api.invoke.mock.calls[0][1].body.payload.request_id;
 expect(localStorage.length).toBe(1);
 await roomCall('message',{deal_room_id:'room',text:'Bonjour'});
 expect(api.invoke.mock.calls[1][1].body.payload.request_id).toBe(first);
 expect(localStorage.length).toBe(0);
});
it('never confirms a response after the signed-in account has changed',async()=>{
 api.invoke.mockImplementation(async()=>{api.user='seller';return {error:null,data:{ok:true,data:{deal_room_id:'private-room'}}};});
 await expect(roomCall('message',{deal_room_id:'room',text:'Privé'})).rejects.toThrow('Votre compte a changé');
 expect(localStorage.length).toBe(1);
});
