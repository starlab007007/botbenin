
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
    // Gérer la redirection après connexion Google réussie
    const handleGoogleAuthCallback = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const accessToken = urlParams.get('access_token');
      const refreshToken = urlParams.get('refresh_token');
      
      if (accessToken && isAuthenticated && user?.authProvider === 'google') {
        // Nettoyer l'URL
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Afficher un message de succès
        toast({
          title: "Connexion Google réussie",
          description: `Bienvenue ${user.name} ! Vos informations ont été récupérées.`,
        });
        
        // Rediriger vers Mon Compte si pas déjà sur cette page
        if (location.pathname !== '/account') {
          navigate('/account', { replace: true });
        }
      }
    };

    // Vérifier si nous sommes dans un callback Google
    if (window.location.search.includes('access_token') || window.location.hash.includes('access_token')) {
      handleGoogleAuthCallback();
    }
  }, [isAuthenticated, user, navigate, location.pathname, toast]);

  return null; // Ce composant ne rend rien
};
