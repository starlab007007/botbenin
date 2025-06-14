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
  ExternalLink,
  Smartphone,
  MessageSquare,
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
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

// Custom SVGs for platforms not in lucide-react
const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="none" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="12" fill="#25D366"/>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.472-.148-.67.15-.198.297-.767.967-.94 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.131-.606.135-.135.298-.349.446-.523.149-.173.198-.297.298-.495.099-.198.05-.372-.025-.521-.074-.149-.669-1.614-.918-2.217-.242-.581-.487-.501-.67-.51-.173-.008-.372-.01-.571-.01-.198 0-.52.074-.792.372-.297.297-1.039 1.017-1.039 2.479 0 1.462 1.064 2.875 1.214 3.072.149.198 2.1 3.205 5.367 4.368.751.258 1.337.412 1.793.527.754.191 1.442.164 1.985.1.606-.07 1.858-.758 2.123-1.49.262-.726.262-1.347.183-1.49-.08-.143-.272-.23-.57-.38z" fill="#fff"/>
  </svg>
);

const TelegramIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="none" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="12" fill="#259CD8"/>
    <path d="M17.67 7.338a.617.617 0 0 0-.64-.1l-9.62 3.8a.617.617 0 0 0 .04 1.167l2.45.86 1.11 3.37a.617.617 0 0 0 1.06.21l1.47-2.08 2.36 1.74a.616.616 0 0 0 .96-.35l1.62-6.15a.617.617 0 0 0-.42-.747zm-7.84 4.247 6.03-2.38-2.9 2.23a.617.617 0 0 0-.19.65l.53 2.04-1.8-1.33a.617.617 0 0 0-.74.13l-1.11 1.33.18-2.67z" fill="#fff"/>
  </svg>
);

const MessengerIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="none" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="12" fill="#006AFF"/>
    <path d="M20 10.763c0-3.272-2.866-5.704-6.002-5.704-3.195 0-5.997 2.509-5.997 5.796 0 1.799.866 3.412 2.216 4.517.097.08.162.197.203.313l.384 1.102c.09.257.402.34.606.176l1.203-.943c.106-.082.251-.103.378-.058a6.288 6.288 0 0 0 1.007.175c.13.016.234.127.273.266l.28.98c.078.273.382.392.603.205l1.001-.853a4.339 4.339 0 0 0 3.845-4.266z" fill="#fff"/>
    <path d="M8.97 15.559a.44.44 0 0 1-.363-.171l-.382-1.1a1.124 1.124 0 0 0-.362-.477C6.381 12.85 5.5 11.121 5.5 9.268c0-3.054 2.67-5.236 6.001-5.236 3.267 0 5.999 2.269 5.999 5.295 0 2.283-1.409 4.313-3.57 5.165a3.014 3.014 0 0 1-1.429.197c-.176-.018-.35.066-.468.228L11.072 15.5a.438.438 0 0 1-.362.059c-.07-.014-.136-.032-.198-.111l.458.111zM7.33 11.924c.039.051.093.09.153.11a.44.44 0 0 0 .38-.066l2.097-1.682c.11-.088.261-.093.375-.012l2.06 1.465c.137.098.344.038.42-.111l2.053-3.664c.107-.191-.153-.38-.343-.265l-6.244 3.868a.223.223 0 0 0-.047.357l.096.09z" fill="#006AFF"/>
  </svg>
);

const TikTokIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="none" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="12" fill="#000"/>
    <g>
      <path d="M15.137 8.02V14.2c0 2.007-1.417 3.06-3.065 3.06-1.57 0-3.072-1.22-3.072-3.075 0-1.733 1.37-3.033 3.04-3.033.273 0 .538.032.787.09V8.02h1.18zm-1.179 6.04v-2.31c-.184-.038-.374-.06-.574-.06-1.161 0-1.908.843-1.908 1.969 0 1.05.794 1.788 1.868 1.788 1.016 0 1.614-.615 1.614-1.387z" fill="#FFF"/>
      <path d="M17.37 8.02a3.098 3.098 0 0 1-1.338-.377c-.428-.239-.712-.587-.823-.854V14.2c0 2.36-1.663 4.06-4.067 4.06C8.06 18.26 6 16.143 6 13.726c0-2.3 1.59-4.063 4.015-4.063.248 0 .492.02.728.056V6.877h2.394c.002.516.254.907.68 1.148.262.15.641.243 1.036.243h.517V8.02z" fill="#25F4EE"/>
    </g>
  </svg>
);

export const SocialSharingManager: React.FC<SocialSharingManagerProps> = ({ 
  botId, 
  botName, 
  shortUrl 
}) => {
  const [campaigns, setCampaigns] = useState<SocialCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    campaign_name: '',
    campaign_description: '',
    target_platforms: [] as string[],
    custom_message: `Découvrez ${botName} - Assistant IA intelligent ! ${shortUrl}`,
  });
  const { toast } = useToast();

  // Les vraies icônes pour chaque plateforme
  const platforms = [
    { 
      id: 'whatsapp', 
      name: 'WhatsApp', 
      icon: <WhatsAppIcon className="w-8 h-8" />,
      color: 'bg-green-500',
      description: 'Partage direct vers WhatsApp'
    },
    { 
      id: 'telegram', 
      name: 'Telegram', 
      icon: <TelegramIcon className="w-8 h-8" />,
      color: 'bg-blue-500',
      description: 'Partage direct vers Telegram'
    },
    { 
      id: 'facebook', 
      name: 'Facebook', 
      icon: <Facebook className="w-8 h-8" />,
      color: 'bg-blue-600',
      description: 'Partage sur Facebook'
    },
    { 
      id: 'messenger', 
      name: 'Messenger', 
      icon: <MessengerIcon className="w-8 h-8" />,
      color: 'bg-blue-400',
      description: 'Partage via Facebook Messenger'
    },
    { 
      id: 'twitter', 
      name: 'Twitter/X', 
      icon: <Twitter className="w-8 h-8" />,
      color: 'bg-sky-500',
      description: 'Partage sur Twitter/X'
    },
    { 
      id: 'linkedin', 
      name: 'LinkedIn', 
      icon: <Linkedin className="w-8 h-8" />,
      color: 'bg-blue-700',
      description: 'Partage professionnel LinkedIn'
    },
    { 
      id: 'tiktok', 
      name: 'TikTok', 
      icon: <TikTokIcon className="w-8 h-8" />,
      color: 'bg-black',
      description: 'Partage sur TikTok'
    },
    { 
      id: 'instagram', 
      name: 'Instagram', 
      icon: <Instagram className="w-8 h-8" />,
      color: 'bg-pink-500',
      description: 'Partage Instagram (copie du lien)'
    }
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
    // Ajout correct des UTM dans l'url
    const trackingUrl = campaign 
      ? `${shortUrl}?utm_source=social_campaign&utm_medium=${platform}&utm_campaign=${campaign.campaign_name.toLowerCase().replace(/\s+/g, '_')}`
      : `${shortUrl}?utm_source=social&utm_medium=${platform}`;
    
    const encodedMessage = encodeURIComponent(message);
    const encodedUrl = encodeURIComponent(trackingUrl);

    switch (platform) {
      case 'whatsapp':
        return `https://wa.me/?text=${encodedMessage}%20${encodedUrl}`;
      case 'telegram':
        return `https://t.me/share/url?url=${encodedUrl}&text=${encodedMessage}`;
      case 'facebook':
        return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedMessage}`;
      case 'messenger':
        return `https://www.facebook.com/dialog/send?link=${encodedUrl}&app_id=264046217437751`;
      case 'twitter':
        return `https://twitter.com/intent/tweet?text=${encodedMessage}&url=${encodedUrl}`;
      case 'linkedin':
        return `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}&summary=${encodedMessage}`;
      case 'tiktok':
      case 'instagram':
        navigator.clipboard.writeText(`${message} ${trackingUrl}`); // copie dans le presse-papier
        return null;
      default:
        return '#';
    }
  };

  const shareOnPlatform = (platform: string, message: string, campaign?: SocialCampaign) => {
    const url = generateSocialUrl(platform, message, campaign);
    
    if (platform === 'tiktok' || platform === 'instagram') {
      toast({
        title: "Lien copié !",
        description: `Le lien pour ${platforms.find(p => p.id === platform)?.name} a été copié. Collez-le dans votre post.`,
      });
      return;
    }
    
    if (url && url !== '#') {
      window.open(url, '_blank', 'width=600,height=400');
      trackSharingEvent(platform, campaign?.id);
    }
  };

  const trackSharingEvent = async (platform: string, campaignId?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Ici on pourrait ajouter une table pour tracker les événements de partage
      console.log(`Partage sur ${platform}`, { campaignId, botId, userId: user.id });
      
    } catch (error) {
      console.error('Erreur lors du tracking du partage:', error);
    }
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
            <span>Partage Rapide sur les Réseaux Sociaux</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {platforms.map((platform) => (
              <Card key={platform.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer border-2 hover:border-blue-200">
                <div className="text-center space-y-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto ${platform.color} text-white`}>
                    {platform.icon}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{platform.name}</h4>
                    <p className="text-xs text-gray-500 mt-1">{platform.description}</p>
                  </div>
                  <Button
                    onClick={() => shareOnPlatform(platform.id, `Découvrez ${botName} - Assistant IA intelligent !`)}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Partager
                  </Button>
                </div>
              </Card>
            ))}
          </div>
          
          {/* Message par défaut personnalisable */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Message de partage par défaut :</h4>
            <p className="text-sm text-gray-700 bg-white p-3 rounded border">
              "Découvrez {botName} - Assistant IA intelligent ! {shortUrl}"
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Créez une campagne personnalisée ci-dessous pour modifier ce message
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Gestion des campagnes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-purple-600" />
              <span>Campagnes de Partage Personnalisées</span>
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
              <h4 className="text-lg font-semibold mb-4">Créer une Campagne Personnalisée</h4>
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
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {platforms.map((platform) => (
                      <Button
                        key={platform.id}
                        onClick={() => togglePlatform(platform.id)}
                        variant={formData.target_platforms.includes(platform.id) ? "default" : "outline"}
                        size="sm"
                        className="flex items-center space-x-1 justify-start"
                      >
                        {platform.icon}
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
                    placeholder="Votre message de partage personnalisé..."
                    rows={3}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Le lien raccourci sera automatiquement ajouté à la fin du message
                  </p>
                </div>
                
                <div className="flex space-x-2">
                  <Button 
                    onClick={createCampaign} 
                    disabled={!formData.campaign_name || formData.target_platforms.length === 0}
                    className="bg-green-600 hover:bg-green-700"
                  >
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
                Aucune campagne personnalisée
              </h3>
              <p className="text-gray-600">
                Créez votre première campagne pour organiser vos partages sociaux avec des messages personnalisés
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {campaigns.map((campaign) => (
                <div key={campaign.id} className="p-4 border rounded-lg bg-white">
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
                            {platform.icon}
                            <span>{platform.name}</span>
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </div>
                  
                  <div className="mb-3 p-3 bg-gray-50 rounded">
                    <p className="text-sm text-gray-700">{campaign.custom_message}</p>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
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
                          {platform.icon}
                          <span>Partager sur {platform.name}</span>
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
