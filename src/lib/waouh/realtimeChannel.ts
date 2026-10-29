import {supabase} from '@/integrations/supabase/client';

const instance = Math.random().toString(36).slice(2);
let sequence = 0;

/** PostgreSQL subscriptions belong to their mounted consumer, never a shared topic.
 * The SDK reuses identical topics, and rejects .on() once one consumer subscribed.
 * Keep broadcast/presence channels on their explicit shared topics instead.
 */
export function scopedRealtimeChannel(scope:string) {
  return supabase.channel(`${scope}:${instance}:${++sequence}`);
}
