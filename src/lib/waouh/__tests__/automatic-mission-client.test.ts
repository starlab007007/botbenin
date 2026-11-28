import {it,expect,vi} from 'vitest';
const invoke=vi.hoisted(()=>vi.fn());vi.mock('../agenticClient',()=>({invokeWaouhAgentic:invoke}));
import {followAutomaticSearch,automaticFollowRetryable} from '../automaticMission';
it('coalesces concurrent requests and keeps ownership separate',async()=>{
 let finish!:(v:unknown)=>void;invoke.mockReturnValue(new Promise(r=>finish=r));const input={goal:'iPhone 13',mode:'buy' as const};
 const first=followAutomaticSearch('a',input),second=followAutomaticSearch('a',input),other=followAutomaticSearch('b',input);expect(first).toBe(second);expect(invoke).toHaveBeenCalledTimes(2);expect(invoke.mock.calls[0][1]).toMatchObject({automatic_follow:true,goal:'iPhone 13'});finish({mandate:null,skipped:'paused'});await Promise.all([first,other]);
});

it('retries only transient follow errors, never a permission or validation refusal',()=>{for(const status of [401,403,404,409,422])expect(automaticFollowRetryable({status})).toBe(false);for(const status of [408,429,500,503])expect(automaticFollowRetryable({status})).toBe(true);expect(automaticFollowRetryable(new Error('offline'))).toBe(true);});

it('uses a dedicated action for explicit delegation so older servers cannot create an ordinary mandate', async () => {
  invoke.mockClear();
  invoke.mockRejectedValueOnce(Object.assign(new Error('unknown_action'), { status: 404 }));
  await expect(followAutomaticSearch('owner', {
    goal: 'iPhone 13', mode: 'buy', budget_max: 225000, confirmed_entry_delegation: true,
  })).rejects.toThrow('unknown_action');
  expect(invoke).toHaveBeenCalledTimes(1);
  expect(invoke).toHaveBeenCalledWith(
    'nexus.mandate.start_guided',
    expect.objectContaining({ confirmed_entry_delegation: true, budget_max: 225000 }),
    { expectedOwner: 'owner' },
  );
});
