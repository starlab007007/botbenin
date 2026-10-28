/** Persisted scheduling: a new runtime instance must respect the same cooldown. */
export function sourceScanDue(source:{last_scan_at?:string|null;scan_freq_min?:number|null;config?:Record<string,unknown>|null},now=Date.now()) {
  const retry=Date.parse(String(source.config?.retry_after??''));
  if(Number.isFinite(retry)&&retry>now)return false;
  const previous=Date.parse(source.last_scan_at??'');
  const frequency=Number(source.scan_freq_min);
  const minutes=Number.isFinite(frequency)&&frequency>0?Math.max(1,frequency):60;
  return !Number.isFinite(previous)||previous+minutes*60000<=now;
}
export function sourceRetryAt(status:number,now=Date.now()) {
  const minutes=status===402?360:status===401||status===403?60:status===429?15:5;
  return new Date(now+minutes*60000).toISOString();
}
