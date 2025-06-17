
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Bot, ExternalLink, AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { initializeVisitorTracking } from '@/utils/visitorTracking';

export const ShortLinkRedirectPage: React.FC = () => {
  const { shortCode } = useParams<{ shortCode: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

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

      // Enregistrer le clic avec gestion d'erreur améliorée
      const { data: botId, error: trackError } = await supabase.rpc('track_link_click', {
        p_short_code: shortCode,
        p_user_agent: userAgent,
        p_referrer: referrer || null
      });

      if (trackError) {
        console.error('❌ Erreur lors du tracking du clic:', trackError);
        
        // Gestion spécifique des différents types d'erreurs
        if (trackError.message?.includes('n\'existe plus') || trackError.message?.includes('does not exist')) {
          setError('Ce lien pointe vers un assistant qui n\'est plus disponible. Le lien a été automatiquement désactivé.');
        } else if (trackError.message?.includes('non trouvé') || trackError.message?.includes('not found')) {
          setError('Lien raccourci non trouvé ou expiré. Veuillez vérifier le lien.');
        } else if (trackError.message?.includes('inactive')) {
          setError('Ce lien a été désactivé. Contactez la personne qui vous l\'a fourni.');
        } else {
          setError(`Erreur lors de l'accès au lien: ${trackError.message}`);
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
        
        if (typeof trackingResult === 'string' && trackingResult.includes('Erreur')) {
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
      
      // Messages d'erreur plus spécifiques
      if (error.message?.includes('Bot') && error.message?.includes('does not exist')) {
        setError('L\'assistant associé à ce lien n\'existe plus ou a été supprimé.');
      } else if (error.message?.includes('session')) {
        setError('Problème de session. Cette erreur a été signalée automatiquement.');
      } else {
        setError('Une erreur inattendue est survenue. Veuillez réessayer.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = async () => {
    if (retryCount >= 3) {
      setError('Trop de tentatives. Le lien semble être définitivement inaccessible.');
      return;
    }

    setIsRetrying(true);
    setRetryCount(prev => prev + 1);
    
    // Attendre un délai progressif
    const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
    
    setTimeout(() => {
      setIsRetrying(false);
      handleRedirect();
    }, delay);
  };

  const handleGoHome = () => {
    navigate('/');
  };

  const handleDiagnostic = async () => {
    try {
      // Récupérer le bot_id du lien pour diagnostic
      const { data: linkData } = await supabase
        .from('shortened_links')
        .select('bot_id')
        .eq('short_code', shortCode)
        .single();

      if (linkData?.bot_id) {
        // Exécuter le diagnostic automatique
        const { data: diagnosticResult } = await supabase.rpc('diagnose_bot_session_issues', {
          p_bot_id: linkData.bot_id
        });

        console.log('🔍 Résultat du diagnostic:', diagnosticResult);
        
        // Tenter une réparation automatique
        const { data: autoFixResult } = await supabase.rpc('auto_fix_session_issues', {
          p_bot_id: linkData.bot_id
        });

        console.log('🔧 Réparation automatique:', autoFixResult);
        
        // Réessayer après la réparation
        setTimeout(() => {
          handleRedirect();
        }, 2000);
      }
    } catch (diagError) {
      console.error('Erreur lors du diagnostic:', diagError);
    }
  };

  if (isLoading || isRetrying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="p-8 text-center max-w-md mx-auto">
          <Bot className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-pulse" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {isRetrying ? `Nouvelle tentative (${retryCount}/3)...` : 'Redirection en cours...'}
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
          {isRetrying && (
            <div className="mt-4 text-sm text-gray-500">
              Tentative {retryCount} sur 3...
            </div>
          )}
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
              <br />
              <strong>Tentatives :</strong> {retryCount}/3
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {retryCount < 3 && (
              <button
                onClick={handleRetry}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Réessayer
              </button>
            )}
            <button
              onClick={handleDiagnostic}
              className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center"
              title="Diagnostic et réparation automatique"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Diagnostic Auto
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
            Si le problème persiste après le diagnostic automatique, contactez l'assistance.
          </div>
        </Card>
      </div>
    );
  }

  return null;
};
