
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { SocialSharingManager } from '@/components/SocialSharingManager';
import { VisitorAnalytics } from '@/components/VisitorAnalytics';
import { 
  Link, 
  Share2, 
  Copy, 
  ExternalLink, 
  BarChart3,
  Eye,
  MessageCircle,
  Users,
  TrendingUp
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
        description: "Votre lien public personnalisé avec tracking avancé est maintenant disponible",
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
      {!shortenedLink ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Link className="w-5 h-5 text-blue-600" />
              <span>Lien Public Raccourci</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6">
              <Link className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Aucun lien raccourci
              </h3>
              <p className="text-gray-600 mb-4">
                Créez un lien public court et personnalisé avec tracking avancé des visiteurs
              </p>
              <Button 
                onClick={createShortenedLink}
                disabled={isCreating}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isCreating ? 'Création...' : 'Créer un lien raccourci'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="link" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="link" className="flex items-center space-x-2">
              <Link className="w-4 h-4" />
              <span>Lien</span>
            </TabsTrigger>
            <TabsTrigger value="share" className="flex items-center space-x-2">
              <Share2 className="w-4 h-4" />
              <span>Partage</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4" />
              <span>Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="visitors" className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>Visiteurs</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="link" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Link className="w-5 h-5 text-blue-600" />
                  <span>Lien Public Raccourci</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Lien raccourci principal */}
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-blue-700">Lien raccourci avec tracking</label>
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
                  <div className="mt-2 text-xs text-blue-600">
                    ✅ Tracking des visiteurs anonymes activé
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
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="share" className="mt-6">
            <SocialSharingManager
              botId={botId}
              botName={botName}
              shortUrl={getShortUrl()}
            />
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                  <span>Analytics Détaillées</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Analytics Avancées
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Accédez aux analytics complètes de votre bot pour voir toutes les métriques
                  </p>
                  <Button
                    onClick={() => onViewAnalytics?.(botId, botName)}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Voir les Analytics Complètes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="visitors" className="mt-6">
            <VisitorAnalytics botId={botId} botName={botName} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};
