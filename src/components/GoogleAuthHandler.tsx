
import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

export const GoogleAuthHandler: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const handleGoogleAuthCallback = () => {
      console.log('Gestion du callback Google Auth...');
      console.log('URL actuelle:', window.location.href);
      console.log('Paramètres URL:', window.location.search);
      console.log('Hash URL:', window.location.hash);
      
      // Vérifier les paramètres dans l'URL (query string)
      const urlParams = new URLSearchParams(window.location.search);
      const accessToken = urlParams.get('access_token');
      
      // Vérifier aussi dans le fragment (hash)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const hashAccessToken = hashParams.get('access_token');
      
      const finalAccessToken = accessToken || hashAccessToken;
      
      console.log('Access token trouvé:', finalAccessToken ? 'Oui' : 'Non');
      console.log('Utilisateur authentifié:', isAuthenticated);
      console.log('Utilisateur:', user);
      
      if (finalAccessToken) {
        console.log('Token d\'accès détecté, nettoyage de l\'URL...');
        
        // Nettoyer l'URL des paramètres d'authentification
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
        
        // Attendre que l'authentification soit complète
        const checkAuthAndRedirect = () => {
          if (isAuthenticated && user) {
            console.log('Authentification confirmée, redirection vers account...');
            
            toast({
              title: "Connexion Google réussie",
              description: `Bienvenue ${user.name} ! Redirection vers votre compte...`,
            });
            
            // Redirection avec délai pour s'assurer que le toast s'affiche
            setTimeout(() => {
              navigate('/account', { replace: true });
            }, 1500);
          } else {
            console.log('En attente de l\'authentification...');
            // Réessayer dans 500ms
            setTimeout(checkAuthAndRedirect, 500);
          }
        };
        
        checkAuthAndRedirect();
      }
    };

    // Vérifier si nous sommes dans un callback Google
    const currentUrl = window.location.href;
    if (currentUrl.includes('access_token') || currentUrl.includes('code=')) {
      console.log('Callback Google détecté');
      handleGoogleAuthCallback();
    }
  }, [isAuthenticated, user, navigate, toast]);

  return null; // Ce composant ne rend rien
};
