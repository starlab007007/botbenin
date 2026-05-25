import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { SupportTicket, SupportMessage } from '@/types/support';

export const useSupportTickets = (opts: { adminMode?: boolean } = {}) => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase.from('support_tickets').select('*').order('created_at', { ascending: false });
      if (!opts.adminMode && user) {
        query = query.eq('user_id', user.id);
      }
      const { data, error } = await query;
      if (error) throw error;
      setTickets((data ?? []) as SupportTicket[]);
    } catch (e: any) {
      setError(e.message ?? 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [user, opts.adminMode]);

  useEffect(() => { load(); }, [load]);

  // Realtime updates
  useEffect(() => {
    const channel = supabase
      .channel(`support_tickets_changes_${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => {
        load();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const createTicket = useCallback(async (payload: Partial<SupportTicket> & { title: string; description: string }) => {
    const { data, error } = await supabase.functions.invoke('support-create-ticket', { body: payload });
    if (error) throw error;
    await load();
    return (data as any)?.ticket as SupportTicket;
  }, [load]);

  const updateTicketStatus = useCallback(async (id: string, status: SupportTicket['status'], resolutionSummary?: string) => {
    const patch: any = { status };
    if (status === 'resolu') patch.resolved_at = new Date().toISOString();
    if (status === 'clos') patch.closed_at = new Date().toISOString();
    if (resolutionSummary) patch.resolution_summary = resolutionSummary;
    const { error } = await supabase.from('support_tickets').update(patch).eq('id', id);
    if (error) throw error;
    await load();
  }, [load]);

  const assignTicket = useCallback(async (id: string, agentId: string | null) => {
    const { error } = await supabase
      .from('support_tickets')
      .update({ assigned_to: agentId, status: agentId ? 'en_cours' : 'ouvert' })
      .eq('id', id);
    if (error) throw error;
    await load();
  }, [load]);

  return { tickets, loading, error, reload: load, createTicket, updateTicketStatus, assignTicket };
};

export const useSupportTicket = (id: string | undefined) => {
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [t, m] = await Promise.all([
      supabase.from('support_tickets').select('*').eq('id', id).maybeSingle(),
      supabase.from('support_ticket_messages').select('*').eq('ticket_id', id).order('created_at', { ascending: true }),
    ]);
    if (!t.error) setTicket(t.data as any);
    if (!m.error) setMessages((m.data ?? []) as any);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`ticket_${id}_${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_ticket_messages', filter: `ticket_id=eq.${id}` }, load)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'support_tickets', filter: `id=eq.${id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, load]);

  const addMessage = useCallback(async (message: string, isInternal = false) => {
    if (!id) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) throw new Error('Non authentifié');
    const { error } = await supabase.from('support_ticket_messages').insert({
      ticket_id: id,
      author_id: u.user.id,
      author_role: isInternal ? 'support_agent' : 'user',
      message,
      is_internal_note: isInternal,
    });
    if (error) throw error;
  }, [id]);

  return { ticket, messages, loading, reload: load, addMessage };
};
