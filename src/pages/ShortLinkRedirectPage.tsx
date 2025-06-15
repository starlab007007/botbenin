
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Bot, ExternalLink } from 'lucide-react';
import { initializeVisitorTracking } from '@/utils/visitorTracking';

export const ShortLinkRedirectPage: React.FC = () => {
  const { shortCode } = useParams<{ shortCode: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shortCode) {
      navigate('/');
      return;
    }

    handleRedirect();
  }, [shortCode, navigate]);

  const handleRedirect = async () => {
    try {
      setIsLoading(true);

      // Collecter les informations de tracking
      const userAgent = navigator.userAgent;
      const referrer = document.referrer;

      console.log('Redirection lien raccourci:', shortCode);

      // Enregistrer le clic et récupérer l'ID du bot
      const { data: botId, error: trackError } = await supabase.rpc('track_link_click', {
        p_short_code: shortCode,
        p_user_agent: userAgent,
        p_referrer: referrer || null
      });

      if (trackError) {
        console.error('Erreur lors du tracking du clic:', trackError);
        setError('Lien raccourci non trouvé ou expiré');
        return;
      }

      console.log('Redirection vers le bot:', botId);

      // Initialiser le tracking du visiteur avec le point d'entrée "shortened_link"
      try {
        await initializeVisitorTracking(botId, 'shortened_link');
      } catch (trackingError) {
        console.warn('Erreur lors de l\'initialisation du tracking:', trackingError);
        // Continuer même si le tracking échoue
      }

      // Rediriger vers la page de chat avec le bot ID
      const chatUrl = `/chat?bot=${botId}&entry=shortened_link&ref=${shortCode}`;
      window.location.href = chatUrl;

    } catch (error) {
      console.error('Erreur lors de la redirection:', error);
      setError('Une erreur est survenue lors de la redirection');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="p-8 text-center max-w-md mx-auto">
          <Bot className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-pulse" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Redirection en cours...
          </h2>
          <p className="text-gray-600 mb-4">
            Nous vous redirigeons vers votre assistant IA
          </p>
          <div className="text-xs text-gray-500">
            Tracking des visiteurs activé pour améliorer votre expérience
          </div>
          <div className="mt-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="p-8 text-center max-w-md mx-auto">
          <ExternalLink className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Lien non trouvé
          </h2>
          <p className="text-gray-600 mb-6">
            {error}
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retour à l'accueil
          </button>
        </Card>
      </div>
    );
  }

  return null;
};
