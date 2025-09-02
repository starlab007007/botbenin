import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, AlertTriangle, RefreshCw, ExternalLink, Shield } from 'lucide-react';

interface AutoWAHAAuthProps {
  onAuthComplete: () => void;
}

const AutoWAHAAuth: React.FC<AutoWAHAAuthProps> = ({ onAuthComplete }) => {
  const [authStatus, setAuthStatus] = useState<'idle' | 'authenticating' | 'success' | 'error'>('idle');
  const [authStep, setAuthStep] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const performAutoAuth = async () => {
    setAuthStatus('authenticating');
    setErrorMessage('');

    try {
      setAuthStep('Authentification sur WAHA API...');
      
      // Obtenir les headers d'auth
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Session utilisateur requise');
      }

      // Appeler l'edge function d'auth automatique
      const { data, error } = await supabase.functions.invoke('waha-auto-auth', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (error) throw error;

      if (data.success) {
        setAuthStep('Authentification réussie!');
        setAuthStatus('success');
        setTimeout(() => {
          onAuthComplete();
        }, 1000);
      } else {
        throw new Error(data.error || 'Échec de l\'authentification');
      }

    } catch (error: any) {
      console.error('Auto auth failed:', error);
      setAuthStatus('error');
      setErrorMessage(error.message || 'Erreur d\'authentification');
    }
  };

  // Auto-start auth on component mount
  useEffect(() => {
    performAutoAuth();
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-500" />
            Authentification Automatique WAHA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {authStatus === 'authenticating' && (
            <Alert>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <AlertDescription>
                {authStep || 'Connexion en cours...'}
              </AlertDescription>
            </Alert>
          )}

          {authStatus === 'success' && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Authentification réussie! Redirection vers le dashboard WhatsApp...
              </AlertDescription>
            </Alert>
          )}

          {authStatus === 'error' && (
            <Alert variant="destructive">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                {errorMessage}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${
                  authStatus === 'success' ? 'bg-green-500' : 
                  authStatus === 'authenticating' ? 'bg-yellow-500' : 'bg-gray-300'
                }`}></div>
                <span className="text-sm">WAHA API (admin:admin)</span>
              </div>
              {authStatus === 'success' && <CheckCircle className="w-4 h-4 text-green-500" />}
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${
                  authStatus === 'success' ? 'bg-green-500' : 
                  authStatus === 'authenticating' ? 'bg-yellow-500' : 'bg-gray-300'
                }`}></div>
                <span className="text-sm">WAHA Dashboard (admin:admin2025)</span>
              </div>
              {authStatus === 'success' && <CheckCircle className="w-4 h-4 text-green-500" />}
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={performAutoAuth}
              disabled={authStatus === 'authenticating'}
              className="flex-1"
            >
              {authStatus === 'authenticating' ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Authentification...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Réessayer l'authentification
                </>
              )}
            </Button>

            <Button 
              variant="outline"
              onClick={() => window.open('https://waha.bot.bj/dashboard', '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Dashboard WAHA
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AutoWAHAAuth;