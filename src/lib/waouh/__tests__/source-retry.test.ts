import {expect,it} from 'vitest';
import {sourceScanDue,sourceRetryAt} from '../../../../supabase/functions/_shared/waouh-source-retry';
const now=Date.parse('2026-10-29T00:00:00Z');
it('honours the configured frequency instead of scraping on every cron tick',()=>{
 expect(sourceScanDue({scan_freq_min:60,last_scan_at:new Date(now-60000).toISOString()},now)).toBe(false);
 expect(sourceScanDue({scan_freq_min:60,last_scan_at:new Date(now-3600000).toISOString()},now)).toBe(true);
 expect(sourceScanDue({},now)).toBe(true);
});
it('persists quota and transient cooldowns without disabling a source permanently',()=>{
 for(const [status,minutes] of [[402,360],[429,15],[503,5]]){
  const retry_after=sourceRetryAt(status,now),source={config:{retry_after},scan_freq_min:1};
  expect(sourceScanDue(source,now+60000)).toBe(false);
  expect(Date.parse(retry_after)-now).toBe(minutes*60000);
  expect(sourceScanDue(source,Date.parse(retry_after))).toBe(true);
 }
});
