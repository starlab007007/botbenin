import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface QualificationCampaign {
  id: string;
  name: string;
  botId: string;
  botName: string;
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
      // Simuler le chargement des campagnes
      // Dans un vrai projet, cela viendrait de Supabase
      const mockCampaigns: QualificationCampaign[] = [
        {
          id: '1',
          name: 'Qualification Prospects B2B Q1 2024',
          botId: 'bot-1',
          botName: 'Bot Qualification B2B Pro',
          message: 'Bonjour ! Nous avons développé des solutions qui pourraient vous intéresser...',
          channels: ['whatsapp', 'email'],
          targetEmails: ['prospect1@test.com', 'prospect2@test.com'],
          targetPhones: ['+33123456789'],
          status: 'active',
          createdAt: '2024-01-15T10:00:00Z',
          launchedAt: '2024-01-15T10:30:00Z',
          totalSent: 47,
          totalResponses: 35,
          totalQualified: 12,
          averageScore: 7.8
        },
        {
          id: '2',
          name: 'Test Campagne PME',
          botId: 'bot-2',
          botName: 'Bot Qualification Standard',
          message: 'Bonjour, nous proposons des solutions adaptées...',
          channels: ['sms'],
          targetEmails: [],
          targetPhones: ['+33234567890', '+33345678901'],
          status: 'completed',
          createdAt: '2024-01-10T14:00:00Z',
          launchedAt: '2024-01-10T14:30:00Z',
          completedAt: '2024-01-12T18:00:00Z',
          totalSent: 23,
          totalResponses: 18,
          totalQualified: 8,
          averageScore: 6.2
        }
      ];

      setCampaigns(mockCampaigns);
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
      // Simuler le chargement des résultats
      const mockResults: QualificationResult[] = [
        {
          id: '1',
          campaignId: '1',
          campaignName: 'Qualification Prospects B2B Q1 2024',
          contactName: 'Marie Dubois',
          companyName: 'TechnoSoft SARL',
          email: 'marie.dubois@technosoft.fr',
          phone: '+33123456789',
          channel: 'whatsapp',
          status: 'completed',
          score: 8.5,
          responses: [
            { question: 'Quel est votre budget annuel pour ce type de solution ?', answer: '15-25K€', score: 9 },
            { question: 'Dans quel délai souhaitez-vous implémenter la solution ?', answer: '3-6 mois', score: 8 },
            { question: 'Qui prend la décision finale ?', answer: 'Je suis décisionnaire', score: 10 },
            { question: 'Avez-vous déjà une solution en place ?', answer: 'Solution obsolète', score: 7 }
          ],
          createdAt: '2024-01-15T10:30:00Z',
          completedAt: '2024-01-15T11:45:00Z',
          botUsed: 'Bot Qualification B2B Pro'
        },
        {
          id: '2',
          campaignId: '1',
          campaignName: 'Qualification Prospects B2B Q1 2024',
          contactName: 'Jean Martin',
          companyName: 'Martin & Associés',
          email: 'j.martin@martin-associes.fr',
          phone: '+33234567890',
          channel: 'email',
          status: 'partial',
          score: 5.2,
          responses: [
            { question: 'Quel est votre budget annuel pour ce type de solution ?', answer: '5-10K€', score: 6 },
            { question: 'Dans quel délai souhaitez-vous implémenter la solution ?', answer: 'Pas défini', score: 4 }
          ],
          createdAt: '2024-01-14T14:20:00Z',
          botUsed: 'Bot Qualification B2B Pro'
        }
      ];

      setResults(mockResults);
    } catch (err: any) {
      console.error('Erreur chargement résultats:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createCampaign = async (campaignData: Omit<QualificationCampaign, 'id' | 'createdAt' | 'totalSent' | 'totalResponses' | 'totalQualified' | 'averageScore'>) => {
    try {
      // Simuler la création de campagne
      const newCampaign: QualificationCampaign = {
        ...campaignData,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
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