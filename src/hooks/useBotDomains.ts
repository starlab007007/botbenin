import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface BotDomain {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  context_indicators: any;
}

export interface BotDomainAssignment {
  id: string;
  bot_id: string;
  domain_id: string;
  confidence_score: number;
  assigned_by: string;
  created_at: string;
  domain: BotDomain;
}

export const useBotDomains = (botId?: string) => {
  const [domains, setDomains] = useState<BotDomain[]>([]);
  const [assignments, setAssignments] = useState<BotDomainAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDomains = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bot_domains')
        .select('*')
        .order('name');

      if (error) throw error;
      setDomains(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  const fetchBotAssignments = async () => {
    if (!botId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bot_domain_assignments')
        .select(`
          *,
          domain:bot_domains(*)
        `)
        .eq('bot_id', botId)
        .order('confidence_score', { ascending: false });

      if (error) throw error;
      setAssignments(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  const assignDomainToBot = async (domainId: string, confidenceScore: number = 1.0) => {
    if (!botId) return;

    try {
      const { error } = await supabase
        .from('bot_domain_assignments')
        .insert({
          bot_id: botId,
          domain_id: domainId,
          confidence_score: confidenceScore,
          assigned_by: 'manual'
        });

      if (error) throw error;
      await fetchBotAssignments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'assignation');
    }
  };

  const removeDomainFromBot = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from('bot_domain_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;
      await fetchBotAssignments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    }
  };

  const detectBotDomains = async () => {
    if (!botId) return;

    try {
      const { data, error } = await supabase.rpc('detect_bot_domain', {
        p_bot_id: botId
      });

      if (error) throw error;
      return data || [];
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la détection');
      return [];
    }
  };

  useEffect(() => {
    fetchDomains();
  }, []);

  useEffect(() => {
    if (botId) {
      fetchBotAssignments();
    }
  }, [botId]);

  return {
    domains,
    assignments,
    loading,
    error,
    assignDomainToBot,
    removeDomainFromBot,
    detectBotDomains,
    refreshDomains: fetchDomains,
    refreshAssignments: fetchBotAssignments
  };
};