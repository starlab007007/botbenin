
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Link, 
  Share2, 
  Copy, 
  ExternalLink, 
  BarChart3,
  Eye,
  MessageCircle,
  Users
} from 'lucide-react';

interface ShortenedLink {
  id: string;
  bot_id: string;
  short_code: string;
  original_url: string;
  click_count: number;
  created_at: string;
  is_active: boolean;
}

interface ShortenedLinksManagerProps {
  botId: string;
  botName: string;
  onViewAnalytics?: (botId: string, botName: string) => void;
}

export const ShortenedLinksManager: React.FC<ShortenedLinksManagerProps> = ({ 
  botId, 
  botName,
  onViewAnalytics 
}) => {
  const [shortenedLink, setShortenedLink] = useState<ShortenedLink | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchShortenedLink();
  }, [botId]);

  const fetchShortenedLink = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('shortened_links')
        .select('*')
        .eq('bot_id', botId)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setShortenedLink(data);
    } catch (error) {
      console.error('Erreur lors du chargement du lien raccourci:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createShortenedLink = async () => {
    try {
      setIsCreating(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: ownerData } = await supabase
        .from('bot_owners')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!ownerData) return;

      const { data, error } = await supabase.rpc('create_shortened_link', {
        p_bot_id: botId,
        p_owner_id: ownerData.id
      });

      if (error) throw error;

      toast({
        title: "Lien raccourci créé !",
        description: "Votre lien public personnalisé est maintenant disponible",
      });

      // Recharger les données
      await fetchShortenedLink();

    } catch (error) {
      console.error('Erreur lors de la création du lien raccourci:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer le lien raccourci",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copié !",
        description: `${label} copié dans le presse-papiers`,
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de copier dans le presse-papiers",
        variant: "destructive",
      });
    }
  };

  const getShortUrl = () => {
    return shortenedLink ? `https://ia.bot.bj/s/${shortenedLink.short_code}` : '';
  };

  const getShareUrls = () => {
    const shortUrl = getShortUrl();
    const message = `Discutez avec ${botName} - Assistant IA intelligent`;
    
    return {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(`${message} ${shortUrl}`)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(shortUrl)}&text=${encodeURIComponent(message)}`,
      messenger: `https://www.facebook.com/dialog/send?link=${encodeURIComponent(shortUrl)}&app_id=YOUR_APP_ID`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(shortUrl)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shortUrl)}`
    };
  };

  const shareUrls = getShareUrls();

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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Link className="w-5 h-5 text-blue-600" />
          <span>Lien Public Raccourci</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {!shortenedLink ? (
          <div className="text-center py-6">
            <Link className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Aucun lien raccourci
            </h3>
            <p className="text-gray-600 mb-4">
              Créez un lien public court et personnalisé pour votre chatbot
            </p>
            <Button 
              onClick={createShortenedLink}
              disabled={isCreating}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isCreating ? 'Création...' : 'Créer un lien raccourci'}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Lien raccourci principal */}
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-blue-700">Lien raccourci</label>
                <Badge variant="outline" className="text-blue-600">
                  {shortenedLink.click_count} clics
                </Badge>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={getShortUrl()}
                  readOnly
                  className="flex-1 px-3 py-2 bg-white border border-blue-200 rounded-md text-sm"
                />
                <Button
                  onClick={() => copyToClipboard(getShortUrl(), 'Lien raccourci')}
                  variant="outline"
                  size="sm"
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  onClick={() => window.open(getShortUrl(), '_blank')}
                  variant="outline"
                  size="sm"
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Boutons de partage social */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                <Share2 className="w-4 h-4 mr-2" />
                Partager sur les réseaux sociaux
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Button
                  onClick={() => window.open(shareUrls.whatsapp, '_blank')}
                  variant="outline"
                  size="sm"
                  className="text-green-600 border-green-200 hover:bg-green-50"
                >
                  📱 WhatsApp
                </Button>
                <Button
                  onClick={() => window.open(shareUrls.telegram, '_blank')}
                  variant="outline"
                  size="sm"
                  className="text-blue-500 border-blue-200 hover:bg-blue-50"
                >
                  ✈️ Telegram
                </Button>
                <Button
                  onClick={() => window.open(shareUrls.messenger, '_blank')}
                  variant="outline"
                  size="sm"
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  💬 Messenger
                </Button>
                <Button
                  onClick={() => window.open(shareUrls.twitter, '_blank')}
                  variant="outline"
                  size="sm"
                  className="text-sky-500 border-sky-200 hover:bg-sky-50"
                >
                  🐦 Twitter
                </Button>
                <Button
                  onClick={() => window.open(shareUrls.linkedin, '_blank')}
                  variant="outline"
                  size="sm"
                  className="text-blue-700 border-blue-200 hover:bg-blue-50"
                >
                  💼 LinkedIn
                </Button>
                <Button
                  onClick={() => copyToClipboard(getShortUrl(), 'Lien')}
                  variant="outline"
                  size="sm"
                  className="text-gray-600 border-gray-200 hover:bg-gray-50"
                >
                  📋 Copier
                </Button>
              </div>
            </div>

            {/* Statistiques rapides */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{shortenedLink.click_count}</div>
                <div className="text-xs text-gray-500">Clics totaux</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {new Date(shortenedLink.created_at).toLocaleDateString('fr-FR')}
                </div>
                <div className="text-xs text-gray-500">Créé le</div>
              </div>
              <div className="text-center">
                <Button
                  onClick={() => onViewAnalytics?.(botId, botName)}
                  variant="outline"
                  size="sm"
                  className="text-purple-600 border-purple-200 hover:bg-purple-50"
                >
                  <BarChart3 className="w-4 h-4 mr-1" />
                  Analytics
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
