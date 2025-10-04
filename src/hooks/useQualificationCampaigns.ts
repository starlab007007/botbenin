import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface QualificationCampaign {
  id: string;
  name: string;
  botId: string;
  botName: string;
  botLink?: string;
  message: string;
  channels: string[];
  targetEmails: string[];
  targetPhones: string[];
  status: 'draft' | 'active' | 'paused' | 'completed';
  createdAt: string;
  launchedAt?: string;
  completedAt?: string;
  totalSent: number;
  totalResponses: number;
  totalQualified: number;
  averageScore: number;
}

export interface QualificationResult {
  id: string;
  campaignId: string;
  campaignName: string;
  contactName: string;
  companyName: string;
  email: string;
  phone: string;
  channel: 'whatsapp' | 'sms' | 'email';
  status: 'completed' | 'partial' | 'no-response';
  score: number;
  responses: {
    question: string;
    answer: string;
    score?: number;
  }[];
  createdAt: string;
  completedAt?: string;
  botUsed: string;
}

export const useQualificationCampaigns = () => {
  const [campaigns, setCampaigns] = useState<QualificationCampaign[]>([]);
  const [results, setResults] = useState<QualificationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { session } = useAuth();
  const { toast } = useToast();

  const loadCampaigns = async () => {
    if (!session?.user?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('qualification_campaigns')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const campaigns: QualificationCampaign[] = (data || []).map(row => ({
        id: row.id,
        name: row.name,
        botId: row.bot_id || '',
        botName: row.bot_name,
        message: row.message,
        channels: row.channels || [],
        targetEmails: row.target_emails || [],
        targetPhones: row.target_phones || [],
        status: row.status as 'draft' | 'active' | 'paused' | 'completed',
        createdAt: row.created_at,
        launchedAt: row.launched_at || undefined,
        completedAt: row.completed_at || undefined,
        totalSent: row.total_sent,
        totalResponses: row.total_responses,
        totalQualified: row.total_qualified,
        averageScore: row.average_score || 0
      }));

      setCampaigns(campaigns);
    } catch (err: any) {
      console.error('Erreur chargement campagnes:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadResults = async () => {
    if (!session?.user?.id) return;

    setLoading(true);
    try {
      // Récupérer les résultats de qualification avec les infos de campagne
      const { data: campaigns } = await supabase
        .from('qualification_campaigns')
        .select('id')
        .eq('user_id', session.user.id);

      if (!campaigns || campaigns.length === 0) {
        setResults([]);
        return;
      }

      const campaignIds = campaigns.map(c => c.id);

      const { data, error } = await supabase
        .from('qualification_results')
        .select(`
          *,
          campaign:qualification_campaigns(name)
        `)
        .in('campaign_id', campaignIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const results: QualificationResult[] = (data || []).map(row => ({
        id: row.id,
        campaignId: row.campaign_id,
        campaignName: (row.campaign as any)?.name || 'Campagne inconnue',
        contactName: row.contact_name,
        companyName: row.company_name || '',
        email: row.email || '',
        phone: row.phone || '',
        channel: row.channel as 'whatsapp' | 'sms' | 'email',
        status: row.status as 'completed' | 'partial' | 'no-response',
        score: row.score || 0,
        responses: Array.isArray(row.responses) ? row.responses as { question: string; answer: string; score?: number }[] : [],
        createdAt: row.created_at,
        completedAt: row.completed_at || undefined,
        botUsed: ''
      }));

      setResults(results);
    } catch (err: any) {
      console.error('Erreur chargement résultats:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createCampaign = async (campaignData: Omit<QualificationCampaign, 'id' | 'createdAt' | 'totalSent' | 'totalResponses' | 'totalQualified' | 'averageScore'>) => {
    if (!session?.user?.id) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase
        .from('qualification_campaigns')
        .insert({
          user_id: session.user.id,
          name: campaignData.name,
          bot_id: campaignData.botId || null,
          bot_name: campaignData.botName,
          bot_link: campaignData.botLink || '',
          message: campaignData.message,
          channels: campaignData.channels,
          target_emails: campaignData.targetEmails,
          target_phones: campaignData.targetPhones,
          status: campaignData.status as 'draft' | 'active' | 'paused' | 'completed'
        })
        .select()
        .single();

      if (error) throw error;

      const newCampaign: QualificationCampaign = {
        id: data.id,
        name: data.name,
        botId: data.bot_id || '',
        botName: data.bot_name,
        botLink: data.bot_link,
        message: data.message,
        channels: data.channels || [],
        targetEmails: data.target_emails || [],
        targetPhones: data.target_phones || [],
        status: data.status as 'draft' | 'active' | 'paused' | 'completed',
        createdAt: data.created_at,
        totalSent: 0,
        totalResponses: 0,
        totalQualified: 0,
        averageScore: 0
      };

      setCampaigns(prev => [newCampaign, ...prev]);
      
      toast({
        title: "Campagne créée",
        description: `La campagne "${campaignData.name}" a été créée avec succès`,
      });

      return newCampaign;
    } catch (err: any) {
      console.error('Erreur création campagne:', err);
      setError(err.message);
      throw err;
    }
  };

  const launchCampaign = async (campaignId: string) => {
    try {
      const { error } = await supabase
        .from('qualification_campaigns')
        .update({
          status: 'active',
          launched_at: new Date().toISOString()
        })
        .eq('id', campaignId);

      if (error) throw error;

      setCampaigns(prev => prev.map(campaign => 
        campaign.id === campaignId 
          ? { ...campaign, status: 'active' as const, launchedAt: new Date().toISOString() }
          : campaign
      ));

      toast({
        title: "Campagne lancée",
        description: "La campagne a été lancée avec succès",
      });
    } catch (err: any) {
      console.error('Erreur lancement campagne:', err);
      setError(err.message);
      throw err;
    }
  };

  const pauseCampaign = async (campaignId: string) => {
    try {
      setCampaigns(prev => prev.map(campaign => 
        campaign.id === campaignId 
          ? { ...campaign, status: 'paused' as const }
          : campaign
      ));

      toast({
        title: "Campagne mise en pause",
        description: "La campagne a été mise en pause",
      });
    } catch (err: any) {
      console.error('Erreur pause campagne:', err);
      setError(err.message);
      throw err;
    }
  };

  const deleteCampaign = async (campaignId: string) => {
    try {
      setCampaigns(prev => prev.filter(campaign => campaign.id !== campaignId));
      
      toast({
        title: "Campagne supprimée",
        description: "La campagne a été supprimée",
      });
    } catch (err: any) {
      console.error('Erreur suppression campagne:', err);
      setError(err.message);
      throw err;
    }
  };

  const exportResults = async (campaignId?: string) => {
    try {
      const filteredResults = campaignId 
        ? results.filter(r => r.campaignId === campaignId)
        : results;

      // Simuler l'export
      const csvData = filteredResults.map(result => ({
        'Nom': result.contactName,
        'Entreprise': result.companyName,
        'Email': result.email,
        'Téléphone': result.phone,
        'Canal': result.channel,
        'Statut': result.status,
        'Score': result.score,
        'Campagne': result.campaignName,
        'Date': new Date(result.createdAt).toLocaleDateString('fr-FR')
      }));

      console.log('Export des résultats:', csvData);
      
      toast({
        title: "Export réussi",
        description: `${filteredResults.length} résultats exportés`,
      });
    } catch (err: any) {
      console.error('Erreur export:', err);
      setError(err.message);
      throw err;
    }
  };

  useEffect(() => {
    if (session?.user?.id) {
      loadCampaigns();
      loadResults();
    }
  }, [session?.user?.id]);

  return {
    campaigns,
    results,
    loading,
    error,
    createCampaign,
    launchCampaign,
    pauseCampaign,
    deleteCampaign,
    exportResults,
    refreshCampaigns: loadCampaigns,
    refreshResults: loadResults
  };
};