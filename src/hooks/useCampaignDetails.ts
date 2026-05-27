import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SendJob {
  id: string;
  campaign_id: string;
  contact_id: string;
  to_phone: string;
  status: string; // queued | sending | sent | delivered | read | replied | failed | skipped
  attempt: number;
  last_error: string | null;
  waha_message_id: string | null;
  rendered_body: string | null;
  scheduled_at: string;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  replied_at: string | null;
  created_at: string;
  contact_name?: string | null;
}

export interface CampaignStats {
  total: number;
  queued: number;
  sending: number;
  sent: number;
  delivered: number;
  read: number;
  replied: number;
  failed: number;
  skipped: number;
  pct: (k: keyof Omit<CampaignStats, 'total' | 'pct'>) => number;
}

export function useCampaignDetails(campaignId: string | null) {
  const [jobs, setJobs] = useState<SendJob[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!campaignId) return;
    setLoading(true);
    const { data } = await supabase
      .from('wa_send_jobs')
      .select('*, wa_contacts(display_name)')
      .eq('campaign_id', campaignId)
      .order('scheduled_at', { ascending: true });
    const rows = (data ?? []).map((r: any) => ({ ...r, contact_name: r.wa_contacts?.display_name ?? null }));
    setJobs(rows as SendJob[]);
    setLoading(false);
  }, [campaignId]);

  useEffect(() => { load(); }, [load]);

  // Realtime
  useEffect(() => {
    if (!campaignId) return;
    const ch = supabase.channel(`wa_jobs_${campaignId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'wa_send_jobs', filter: `campaign_id=eq.${campaignId}`,
      }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [campaignId, load]);

  const stats: CampaignStats = useMemo(() => {
    const c = { total: jobs.length, queued: 0, sending: 0, sent: 0, delivered: 0, read: 0, replied: 0, failed: 0, skipped: 0 };
    for (const j of jobs) {
      // hiérarchie : replied > read > delivered > sent
      if (j.replied_at) c.replied++;
      if (j.read_at) c.read++;
      if (j.delivered_at) c.delivered++;
      if (j.sent_at) c.sent++;
      if (j.status === 'queued') c.queued++;
      else if (j.status === 'sending') c.sending++;
      else if (j.status === 'failed') c.failed++;
      else if (j.status === 'skipped') c.skipped++;
    }
    return { ...c, pct: (k) => c.total ? Math.round(((c as any)[k] / c.total) * 100) : 0 };
  }, [jobs]);

  const retryFailed = useCallback(async () => {
    if (!campaignId) return;
    const { error } = await supabase
      .from('wa_send_jobs')
      .update({ status: 'queued', last_error: null, scheduled_at: new Date().toISOString() })
      .eq('campaign_id', campaignId)
      .eq('status', 'failed');
    if (error) toast.error(error.message); else toast.success('Échecs remis en file');
    await load();
  }, [campaignId, load]);

  const retryOne = useCallback(async (jobId: string) => {
    const { error } = await supabase
      .from('wa_send_jobs')
      .update({ status: 'queued', last_error: null, scheduled_at: new Date().toISOString() })
      .eq('id', jobId);
    if (error) toast.error(error.message); else toast.success('Renvoi planifié');
    await load();
  }, [load]);

  return { jobs, loading, stats, retryFailed, retryOne, refresh: load };
}
