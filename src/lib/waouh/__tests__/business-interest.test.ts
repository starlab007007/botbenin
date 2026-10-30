import {expect,it,vi,beforeEach} from 'vitest';
const {call}=vi.hoisted(()=>({call:vi.fn()}));
vi.mock('../convergence',()=>({convergence:call}));
import {openBusinessInterest,interestNumber} from '../businessInterest';
beforeEach(()=>{call.mockReset();});
it('uses one atomic server command with exact selected references',async()=>{call.mockResolvedValue({contact_state:'recorded'});await openBusinessInterest('m','c','ignored','ignored');expect(call.mock.calls).toEqual([['business.open',{mission_id:'m',component_id:'c',confirmed:true}]]);});
it('preserves the external contact-required state',async()=>{call.mockResolvedValue({contact_state:'contact_required'});expect((await openBusinessInterest('m','c','','')).contact_state).toBe('contact_required');expect(call).toHaveBeenCalledTimes(1);});
it('resolves only a displayed number',()=>{expect(interestNumber('Intéressé 2',3)).toBe(1);for(const s of ['Intéressé 0','Intéressé 4','Intéressé 2 puis 3','2'])expect(interestNumber(s,3)).toBe(null);});
