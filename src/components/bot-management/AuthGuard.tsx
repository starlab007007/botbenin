
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, AlertCircle } from 'lucide-react';

interface AuthGuardProps {
  isAuthenticated: boolean;
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ isAuthenticated, children }) => {
  if (!isAuthenticated) {
    return (
      <Card className="p-8 text-center border-amber-200 bg-amber-50">
        <Lock className="w-16 h-16 text-amber-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-amber-900 mb-2">
          Authentification requise
        </h3>
        <p className="text-amber-800 mb-4">
          Connectez-vous pour accéder à vos chatbots et en créer jusqu'à 10 gratuitement
        </p>
        <Button 
          onClick={() => window.location.href = '/auth'}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Se connecter / S'inscrire
        </Button>
      </Card>
    );
  }

  return <>{children}</>;
};
