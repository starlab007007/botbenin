
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Bot, ExternalLink, AlertTriangle, Home } from 'lucide-react';
import { initializeVisitorTracking } from '@/utils/visitorTracking';

export const ShortLinkRedirectPage: React.FC = () => {
  const { shortCode } = useParams<{ shortCode: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

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
      setError(null);

      // Collecter les informations de tracking
      const userAgent = navigator.userAgent;
      const referrer = document.referrer;

      console.log('🔗 Redirection lien raccourci:', shortCode);

      // Enregistrer le clic et récupérer l'ID du bot avec gestion d'erreur améliorée
      const { data: botId, error: trackError } = await supabase.rpc('track_link_click', {
        p_short_code: shortCode,
        p_user_agent: userAgent,
        p_referrer: referrer || null
      });

      if (trackError) {
        console.error('❌ Erreur lors du tracking du clic:', trackError);
        
        // Gestion spécifique des différents types d'erreurs
        if (trackError.message?.includes('n\'existe plus')) {
          setError('Ce lien pointe vers un assistant qui n\'est plus disponible. Le lien a été automatiquement désactivé.');
        } else if (trackError.message?.includes('non trouvé')) {
          setError('Lien raccourci non trouvé ou expiré. Veuillez vérifier le lien.');
        } else {
          setError('Une erreur est survenue lors de l\'accès au lien. Veuillez réessayer.');
        }
        return;
      }

      if (!botId) {
        setError('Impossible de récupérer les informations du bot. Veuillez réessayer.');
        return;
      }

      console.log('✅ Redirection vers le bot:', botId);

      // Initialiser le tracking du visiteur avec gestion d'erreur améliorée
      try {
        const trackingResult = await initializeVisitorTracking(botId, 'shortened_link');
        
        if (typeof trackingResult === 'string' && trackingResult.startsWith('Erreur')) {
          console.warn('⚠️ Erreur de tracking (non bloquant):', trackingResult);
          // Continuer même si le tracking échoue
        }
      } catch (trackingError) {
        console.warn('⚠️ Erreur lors de l\'initialisation du tracking (non bloquant):', trackingError);
        // Continuer même si le tracking échoue
      }

      // Rediriger vers la page de chat avec le bot ID
      const chatUrl = `/chat?bot=${botId}&entry=shortened_link&ref=${shortCode}`;
      console.log('🚀 Redirection vers:', chatUrl);
      window.location.href = chatUrl;

    } catch (error: any) {
      console.error('💥 Erreur générale lors de la redirection:', error);
      setError('Une erreur inattendue est survenue. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    setIsRetrying(true);
    setTimeout(() => {
      setIsRetrying(false);
      handleRedirect();
    }, 1000);
  };

  const handleGoHome = () => {
    navigate('/');
  };

  if (isLoading || isRetrying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="p-8 text-center max-w-md mx-auto">
          <Bot className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-pulse" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {isRetrying ? 'Nouvelle tentative...' : 'Redirection en cours...'}
          </h2>
          <p className="text-gray-600 mb-4">
            Nous vous redirigeons vers votre assistant IA
          </p>
          <div className="text-xs text-gray-500 mb-6">
            Code: {shortCode}
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="p-8 text-center max-w-lg mx-auto">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Problème avec le lien
          </h2>
          <p className="text-gray-600 mb-6 leading-relaxed">
            {error}
          </p>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="text-sm text-gray-500">
              <strong>Code du lien :</strong> {shortCode}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleRetry}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Réessayer
            </button>
            <button
              onClick={handleGoHome}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center"
            >
              <Home className="w-4 h-4 mr-2" />
              Retour à l'accueil
            </button>
          </div>

          <div className="mt-6 text-xs text-gray-500">
            Si le problème persiste, contactez l'assistance.
          </div>
        </Card>
      </div>
    );
  }

  return null;
};
