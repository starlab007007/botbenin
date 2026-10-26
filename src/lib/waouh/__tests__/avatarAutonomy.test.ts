import {describe,it,expect} from 'vitest';
import {DEFAULT_AVATAR_AUTONOMY,normalizeAvatarAutonomy,avatarAutonomyError,autonomyWindowOpen,autonomyContactAllowed,autonomyStartsAt} from '../../../../supabase/functions/_shared/waouh-avatar-autonomy-settings';
describe('Avatar autonomy contract',()=>{
  it('does not grant outreach or negotiation from malformed preferences',()=>{
    const rules=normalizeAvatarAutonomy({allow_contact:'yes',allow_negotiate:1,max_contacts:100,duration_hours:100000});
    expect(rules.allow_contact).toBe(false);expect(rules.allow_negotiate).toBe(false);expect(rules.max_contacts).toBe(5);expect(rules.duration_hours).toBe(24);
  });
  it('enforces Benin hours, including minute boundaries, without depending on device timezone',()=>{
    const mandate={metadata:{autonomy_settings:{...DEFAULT_AVATAR_AUTONOMY,active_start:'08:30',active_end:'20:15'}}};
    expect(autonomyWindowOpen(mandate,new Date('2026-10-26T07:29:00Z'))).toBe(false);
    expect(autonomyWindowOpen(mandate,new Date('2026-10-26T07:30:00Z'))).toBe(true);
    expect(autonomyWindowOpen(mandate,new Date('2026-10-26T19:15:00Z'))).toBe(false);
  });
  it('blocks outreach until both the schedule and explicit permission allow it',()=>{
    const m={metadata:{autonomy_settings:{...DEFAULT_AVATAR_AUTONOMY,allow_contact:true}}};
    expect(autonomyContactAllowed(m,new Date('2026-10-26T10:00:00Z'))).toBe(true);
    expect(autonomyContactAllowed(m,new Date('2026-10-26T23:00:00Z'))).toBe(false);
    expect(autonomyContactAllowed({metadata:{autonomy_settings:DEFAULT_AVATAR_AUTONOMY}},new Date('2026-10-26T10:00:00Z'))).toBe(false);
  });
  it('requires contact permission for negotiation and a coherent daily window',()=>{
    expect(avatarAutonomyError({...DEFAULT_AVATAR_AUTONOMY,allow_negotiate:true})).toBeTruthy();
    expect(avatarAutonomyError({...DEFAULT_AVATAR_AUTONOMY,active_start:'20:00',active_end:'08:00'})).toBeTruthy();
  });
  it('schedules tomorrow using Benin time and never upgrades legacy contracts',()=>{
    expect(autonomyStartsAt({...DEFAULT_AVATAR_AUTONOMY,start:'tomorrow'},new Date('2026-10-26T23:30:00Z')).toISOString()).toBe('2026-10-28T07:00:00.000Z');
    expect(autonomyWindowOpen({metadata:{}})).toBe(true);
    expect(normalizeAvatarAutonomy({agreement:'automatic'}).agreement).toBe('confirm');
  });
});
