import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Share2, 
  MessageCircle, 
  Send, 
  Users,
  BarChart3,
  Plus,
  Edit3,
  Trash2,
  Copy,
  ExternalLink
} from 'lucide-react';

interface SocialCampaign {
  id: string;
  campaign_name: string;
  campaign_description: string;
  target_platforms: string[];
  custom_message: string;
  tracking_parameters: any;
  is_active: boolean;
  created_at: string;
}

interface SocialSharingManagerProps {
  botId: string;
  botName: string;
  shortUrl: string;
}

export const SocialSharingManager: React.FC<SocialSharingManagerProps> = ({ 
  botId, 
  botName, 
  shortUrl 
}) => {
  const [campaigns, setCampaigns] = useState<SocialCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<SocialCampaign | null>(null);
  const [formData, setFormData] = useState({
    campaign_name: '',
    campaign_description: '',
    target_platforms: [] as string[],
    custom_message: `Découvrez ${botName} - Assistant IA intelligent ! ${shortUrl}`,
  });
  const { toast } = useToast();

  const platforms = [
    { id: 'whatsapp', name: 'WhatsApp', icon: '📱', color: 'bg-green-500' },
    { id: 'telegram', name: 'Telegram', icon: '✈️', color: 'bg-blue-500' },
    { id: 'facebook', name: 'Facebook', icon: '📘', color: 'bg-blue-600' },
    { id: 'messenger', name: 'Messenger', icon: '💬', color: 'bg-blue-600' },
    { id: 'twitter', name: 'Twitter/X', icon: '🐦', color: 'bg-sky-500' },
    { id: 'linkedin', name: 'LinkedIn', icon: '💼', color: 'bg-blue-700' },
    { id: 'tiktok', name: 'TikTok', icon: '🎵', color: 'bg-black' },
    { id: 'instagram', name: 'Instagram', icon: '📷', color: 'bg-pink-500' }
  ];

  useEffect(() => {
    fetchCampaigns();
  }, [botId]);

  const fetchCampaigns = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('social_sharing_campaigns')
        .select('*')
        .eq('bot_id', botId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fix: Properly convert Supabase Json types to TypeScript types
      const typedCampaigns: SocialCampaign[] = (data || []).map(campaign => ({
        id: campaign.id,
        campaign_name: campaign.campaign_name,
        campaign_description: campaign.campaign_description,
        target_platforms: Array.isArray(campaign.target_platforms) 
          ? (campaign.target_platforms as string[])
          : typeof campaign.target_platforms === 'string' 
            ? [campaign.target_platforms]
            : [],
        custom_message: campaign.custom_message,
        tracking_parameters: campaign.tracking_parameters,
        is_active: campaign.is_active,
        created_at: campaign.created_at
      }));
      
      setCampaigns(typedCampaigns);
    } catch (error) {
      console.error('Erreur lors du chargement des campagnes:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les campagnes de partage",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createCampaign = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: ownerData } = await supabase
        .from('bot_owners')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!ownerData) return;

      const { error } = await supabase
        .from('social_sharing_campaigns')
        .insert({
          bot_id: botId,
          owner_id: ownerData.id,
          campaign_name: formData.campaign_name,
          campaign_description: formData.campaign_description,
          target_platforms: formData.target_platforms,
          custom_message: formData.custom_message,
          tracking_parameters: {
            utm_source: 'social_campaign',
            utm_medium: formData.target_platforms.join(','),
            utm_campaign: formData.campaign_name.toLowerCase().replace(/\s+/g, '_')
          }
        });

      if (error) throw error;

      toast({
        title: "Campagne créée !",
        description: "Votre campagne de partage social a été créée avec succès",
      });

      setShowCreateForm(false);
      setFormData({
        campaign_name: '',
        campaign_description: '',
        target_platforms: [],
        custom_message: `Découvrez ${botName} - Assistant IA intelligent ! ${shortUrl}`,
      });
      fetchCampaigns();
    } catch (error) {
      console.error('Erreur lors de la création de la campagne:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la campagne",
        variant: "destructive",
      });
    }
  };

  const deleteCampaign = async (campaignId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette campagne ?')) return;

    try {
      const { error } = await supabase
        .from('social_sharing_campaigns')
        .delete()
        .eq('id', campaignId);

      if (error) throw error;

      toast({
        title: "Campagne supprimée",
        description: "La campagne a été supprimée avec succès",
      });

      fetchCampaigns();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la campagne",
        variant: "destructive",
      });
    }
  };

  const generateSocialUrl = (platform: string, message: string, campaign?: SocialCampaign) => {
    const trackingUrl = campaign 
      ? `${shortUrl}?utm_source=social_campaign&utm_medium=${platform}&utm_campaign=${campaign.campaign_name.toLowerCase().replace(/\s+/g, '_')}`
      : shortUrl;
    
    const encodedMessage = encodeURIComponent(message);
    const encodedUrl = encodeURIComponent(trackingUrl);

    switch (platform) {
      case 'whatsapp':
        return `https://wa.me/?text=${encodedMessage}`;
      case 'telegram':
        return `https://t.me/share/url?url=${encodedUrl}&text=${encodedMessage}`;
      case 'facebook':
        return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedMessage}`;
      case 'messenger':
        return `https://www.facebook.com/dialog/send?link=${encodedUrl}&app_id=YOUR_APP_ID`;
      case 'twitter':
        return `https://twitter.com/intent/tweet?text=${encodedMessage}&url=${encodedUrl}`;
      case 'linkedin':
        return `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
      case 'tiktok':
        return `https://www.tiktok.com/share?url=${encodedUrl}`;
      case 'instagram':
        return `https://www.instagram.com/`; // Instagram ne supporte pas les liens directs
      default:
        return '#';
    }
  };

  const shareOnPlatform = (platform: string, message: string, campaign?: SocialCampaign) => {
    const url = generateSocialUrl(platform, message, campaign);
    window.open(url, '_blank', 'width=600,height=400');
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copié !",
        description: "Le lien a été copié dans le presse-papiers",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de copier dans le presse-papiers",
        variant: "destructive",
      });
    }
  };

  const togglePlatform = (platformId: string) => {
    setFormData(prev => ({
      ...prev,
      target_platforms: prev.target_platforms.includes(platformId)
        ? prev.target_platforms.filter(p => p !== platformId)
        : [...prev.target_platforms, platformId]
    }));
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Partage rapide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Share2 className="w-5 h-5 text-blue-600" />
            <span>Partage Rapide</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {platforms.map((platform) => (
              <Button
                key={platform.id}
                onClick={() => shareOnPlatform(platform.id, `Découvrez ${botName} - Assistant IA intelligent ! ${shortUrl}`)}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2 h-12"
              >
                <span className="text-lg">{platform.icon}</span>
                <span className="text-xs">{platform.name}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Gestion des campagnes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-purple-600" />
              <span>Campagnes de Partage</span>
            </CardTitle>
            <Button
              onClick={() => setShowCreateForm(true)}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle Campagne
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showCreateForm && (
            <div className="mb-6 p-4 border rounded-lg bg-gray-50">
              <h4 className="text-lg font-semibold mb-4">Créer une Campagne</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Nom de la campagne</label>
                  <Input
                    value={formData.campaign_name}
                    onChange={(e) => setFormData({ ...formData, campaign_name: e.target.value })}
                    placeholder="Ex: Lancement Bot Restaurant"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <Textarea
                    value={formData.campaign_description}
                    onChange={(e) => setFormData({ ...formData, campaign_description: e.target.value })}
                    placeholder="Description de la campagne..."
                    rows={3}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Plateformes cibles</label>
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                    {platforms.map((platform) => (
                      <Button
                        key={platform.id}
                        onClick={() => togglePlatform(platform.id)}
                        variant={formData.target_platforms.includes(platform.id) ? "default" : "outline"}
                        size="sm"
                        className="flex items-center space-x-1"
                      >
                        <span>{platform.icon}</span>
                        <span className="text-xs">{platform.name}</span>
                      </Button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Message personnalisé</label>
                  <Textarea
                    value={formData.custom_message}
                    onChange={(e) => setFormData({ ...formData, custom_message: e.target.value })}
                    placeholder="Votre message de partage..."
                    rows={3}
                  />
                </div>
                
                <div className="flex space-x-2">
                  <Button onClick={createCampaign} disabled={!formData.campaign_name || formData.target_platforms.length === 0}>
                    Créer la Campagne
                  </Button>
                  <Button onClick={() => setShowCreateForm(false)} variant="outline">
                    Annuler
                  </Button>
                </div>
              </div>
            </div>
          )}

          {campaigns.length === 0 ? (
            <div className="text-center py-8">
              <Share2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Aucune campagne de partage
              </h3>
              <p className="text-gray-600">
                Créez votre première campagne pour organiser vos partages sociaux
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {campaigns.map((campaign) => (
                <div key={campaign.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900">{campaign.campaign_name}</h4>
                      <p className="text-sm text-gray-600">{campaign.campaign_description}</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => deleteCampaign(campaign.id)}
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <div className="flex flex-wrap gap-2">
                      {campaign.target_platforms.map((platformId) => {
                        const platform = platforms.find(p => p.id === platformId);
                        return platform ? (
                          <Badge key={platformId} variant="outline" className="flex items-center space-x-1">
                            <span>{platform.icon}</span>
                            <span>{platform.name}</span>
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </div>
                  
                  <div className="mb-3 p-3 bg-gray-50 rounded">
                    <p className="text-sm text-gray-700">{campaign.custom_message}</p>
                  </div>
                  
                  <div className="flex space-x-2">
                    {campaign.target_platforms.map((platformId) => {
                      const platform = platforms.find(p => p.id === platformId);
                      return platform ? (
                        <Button
                          key={platformId}
                          onClick={() => shareOnPlatform(platformId, campaign.custom_message, campaign)}
                          variant="outline"
                          size="sm"
                          className="flex items-center space-x-1"
                        >
                          <span>{platform.icon}</span>
                          <span>Partager</span>
                        </Button>
                      ) : null;
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
