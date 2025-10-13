
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { HomePage } from './HomePage';

const Index = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Rediriger vers /home si l'utilisateur est connecté
  useEffect(() => {
    if (isAuthenticated) {
      console.log('[Index] User authenticated, redirecting to /home');
      // Délai suffisant pour la propagation complète du contexte après OAuth
      setTimeout(() => {
        navigate('/home', { replace: true });
      }, 500);
    }
  }, [isAuthenticated, navigate]);

  // Afficher le même contenu que /home pour les utilisateurs non connectés
  return <HomePage />;
};

export default Index;
