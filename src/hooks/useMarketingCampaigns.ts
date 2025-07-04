import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MarketingCampaign {
  id: string;
  name: string;
  type: string;
  subject?: string;
  message_template: string;
  target_contacts: any[];
  status: string;
  scheduled_at?: string;
  sent_at?: string;
  results: any;
  created_at: string;
  updated_at: string;
}

interface CreateCampaignData {
  name: string;
  type: 'email' | 'whatsapp' | 'sms';
  subject?: string;
  message_template: string;
  target_contacts: any[];
  scheduled_at?: string;
}

export const useMarketingCampaigns = () => {
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchCampaigns = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('marketing_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform the data to match our interface
      const transformedData = (data || []).map(campaign => ({
        id: campaign.id,
        name: campaign.name,
        type: campaign.type,
        subject: campaign.subject,
        message_template: campaign.message_template,
        target_contacts: campaign.target_contacts || [],
        status: campaign.status,
        scheduled_at: campaign.scheduled_at,
        sent_at: campaign.sent_at,
        results: campaign.results || {},
        created_at: campaign.created_at,
        updated_at: campaign.updated_at
      }));
      
      setCampaigns(transformedData);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les campagnes",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createCampaign = async (campaignData: CreateCampaignData) => {
    try {
      // Get current user
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('marketing_campaigns')
        .insert({
          user_id: userData.user.id,
          name: campaignData.name,
          type: campaignData.type,
          subject: campaignData.subject,
          message_template: campaignData.message_template,
          target_contacts: campaignData.target_contacts,
          status: campaignData.scheduled_at ? 'scheduled' : 'draft',
          scheduled_at: campaignData.scheduled_at,
          results: {}
        })
        .select()
        .single();

      if (error) throw error;
      
      await fetchCampaigns();
      toast({
        title: "Succès",
        description: "Campagne créée avec succès",
      });
      
      return data;
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la campagne",
        variant: "destructive",
      });
      throw error;
    }
  };

  const generateAIMessage = async (businessType: string, campaignType: string, targetAudience: string) => {
    try {
      // For now, we'll generate a template message
      // In a real implementation, you would call an AI service here
      const templates = {
        email: {
          general: `Bonjour {name},

Nous espérons que ce message vous trouve en bonne santé. Nous avons remarqué votre entreprise {company} et nous sommes impressionnés par votre présence dans le secteur.

Nous aimerions vous présenter nos services qui pourraient vous aider à développer votre activité.

Seriez-vous disponible pour un appel de 15 minutes cette semaine ?

Cordialement,
L'équipe`,
          retail: `Bonjour {name},

En tant que responsable chez {company}, vous savez à quel point il est important d'attirer et de fidéliser vos clients.

Notre solution peut vous aider à augmenter vos ventes de 20% en moyenne. Nous travaillons déjà avec plusieurs entreprises de votre secteur.

Puis-je vous envoyer une étude de cas qui pourrait vous intéresser ?

Bien à vous,
L'équipe`,
          services: `Bonjour {name},

J'ai vu que {company} offre d'excellents services dans votre domaine. Félicitations pour votre succès !

Nous aidons des entreprises comme la vôtre à automatiser certains processus pour gagner du temps et réduire les coûts.

Auriez-vous 10 minutes pour découvrir comment nous pourrions vous aider ?

Cordialement,
L'équipe`
        },
        whatsapp: {
          general: `Salut {name} ! 👋

J'ai découvert {company} et je suis impressionné par votre travail ! 

Nous aidons des entreprises comme la vôtre à se développer. 

Peut-on programmer un appel rapide cette semaine ? 📞`,
          retail: `Bonjour {name} ! 🛍️

Votre magasin {company} a l'air fantastique ! 

Nous aidons les commerces à augmenter leurs ventes avec nos outils digitaux.

Intéressé par une démo gratuite ? 📈`,
          services: `Hello {name} ! ⭐

{company} fait du super boulot ! Bravo ! 👏

On aide des pros comme vous à automatiser et gagner du temps.

5 min pour en parler ? ⏰`
        }
      };

      const categoryKey = businessType.toLowerCase().includes('retail') || businessType.toLowerCase().includes('commerce') ? 'retail' :
                         businessType.toLowerCase().includes('service') ? 'services' : 'general';

      const template = templates[campaignType as keyof typeof templates]?.[categoryKey] || templates[campaignType as keyof typeof templates]?.general;

      return template;
    } catch (error) {
      console.error('Error generating AI message:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  return {
    campaigns,
    isLoading,
    fetchCampaigns,
    createCampaign,
    generateAIMessage,
  };
};
