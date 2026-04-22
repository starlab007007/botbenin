import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { SupportTicket } from '@/types/support';

export interface SupportStats {
  total: number;
  open: number;
  inProgress: number;
  resolved24h: number;
  slaRespected: number;
  slaBreached: number;
  bySeverity: { critique: number; majeure: number; mineure: number };
  byModule: Record<string, number>;
  byDay: { date: string; count: number }[];
  recentTickets: SupportTicket[];
  chatbotResolutionRate: number;
}

export const useSupportRealtimeStats = () => {
  const [stats, setStats] = useState<SupportStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
      const oneDayAgo = new Date(Date.now() - 86400_000).toISOString();

      const [{ data: tickets }, { data: chats }] = await Promise.all([
        supabase.from('support_tickets').select('*').gte('created_at', sevenDaysAgo),
        supabase.from('support_chat_sessions').select('id, resolved, escalated_ticket_id').gte('created_at', sevenDaysAgo),
      ]);

      const all = (tickets ?? []) as SupportTicket[];
      const open = all.filter((t) => t.status === 'ouvert').length;
      const inProgress = all.filter((t) => t.status === 'en_cours').length;
      const resolved24h = all.filter((t) => t.resolved_at && t.resolved_at >= oneDayAgo).length;
      const slaBreached = all.filter((t) => t.sla_breached).length;
      const closedOrResolved = all.filter((t) => ['resolu', 'clos'].includes(t.status));
      const slaRespected = closedOrResolved.length === 0 ? 100 :
        Math.round((closedOrResolved.filter(t => !t.sla_breached).length / closedOrResolved.length) * 100);

      const bySeverity = {
        critique: all.filter((t) => t.severity === 'critique').length,
        majeure: all.filter((t) => t.severity === 'majeure').length,
        mineure: all.filter((t) => t.severity === 'mineure').length,
      };

      const byModule: Record<string, number> = {};
      all.forEach((t) => {
        const m = t.module ?? 'Non renseigné';
        byModule[m] = (byModule[m] ?? 0) + 1;
      });

      // Group by day (last 7 days)
      const byDay: { date: string; count: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400_000);
        const key = d.toISOString().slice(0, 10);
        const count = all.filter((t) => t.created_at.slice(0, 10) === key).length;
        byDay.push({ date: key.slice(5), count });
      }

      const recentTickets = all.slice(0, 10);

      const chatList = chats ?? [];
      const chatbotResolutionRate = chatList.length === 0 ? 0 :
        Math.round((chatList.filter((c: any) => c.resolved && !c.escalated_ticket_id).length / chatList.length) * 100);

      setStats({
        total: all.length,
        open,
        inProgress,
        resolved24h,
        slaRespected,
        slaBreached,
        bySeverity,
        byModule,
        byDay,
        recentTickets,
        chatbotResolutionRate,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel('support_stats_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, load)
      .subscribe();
    const interval = setInterval(load, 30_000);
    return () => { supabase.removeChannel(channel); clearInterval(interval); };
  }, [load]);

  return { stats, loading, reload: load };
};
