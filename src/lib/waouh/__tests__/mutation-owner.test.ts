import {beforeEach,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({session:vi.fn(),refresh:vi.fn(),invoke:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{auth:{getSession:mocks.session,refreshSession:mocks.refresh},functions:{invoke:mocks.invoke}}}));
import {invokeWaouhAgentic} from '../agenticClient';
import {saveAvatarAutonomy,DEFAULT_AVATAR_AUTONOMY} from '../avatarAutonomy';
beforeEach(()=>vi.resetAllMocks());
it('does not create a mission after the initiating account has changed',async()=>{
 mocks.session.mockResolvedValue({data:{session:{user:{id:'new-owner'},access_token:'new-token'}}});
 await expect(invokeWaouhAgentic('nexus.mandate.create',{goal:'Need'},{expectedOwner:'original-owner'})).rejects.toThrow('compte a changé');expect(mocks.invoke).not.toHaveBeenCalled();
});
it('binds the explicit initiating session to an automatic action',async()=>{
 mocks.session.mockResolvedValue({data:{session:{user:{id:'owner'},access_token:'test-owner-token'}}});mocks.invoke.mockResolvedValue({data:{ok:true,data:{mandate:{id:'m'}}},error:null});
 await invokeWaouhAgentic('nexus.mandate.create',{goal:'Need'},{expectedOwner:'owner'});expect(mocks.invoke.mock.calls[0][1].headers).toEqual({Authorization:'Bearer test-owner-token'});
});
it('never retries a rejected action using a different account',async()=>{
 mocks.session.mockResolvedValueOnce({data:{session:{user:{id:'owner'},access_token:'test-owner-token'}}}).mockResolvedValueOnce({data:{session:{user:{id:'new-owner'},access_token:'new-token'}}});
 mocks.invoke.mockResolvedValue({data:null,error:{message:'Denied',context:new Response('{}',{status:401})}});
 await expect(invokeWaouhAgentic('nexus.mandate.create',{goal:'Need'},{expectedOwner:'owner'})).rejects.toThrow();expect(mocks.invoke).toHaveBeenCalledTimes(1);expect(mocks.refresh).not.toHaveBeenCalled();
});
it('does not save another account’s permissions during a session transition',async()=>{
 mocks.session.mockResolvedValue({data:{session:{user:{id:'new-owner'},access_token:'new-token'}}});
 await expect(saveAvatarAutonomy(DEFAULT_AVATAR_AUTONOMY,'original-owner')).rejects.toThrow('compte a changé');expect(mocks.invoke).not.toHaveBeenCalled();
});
