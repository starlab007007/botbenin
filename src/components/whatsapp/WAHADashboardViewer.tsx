import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Shield,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  Loader2
} from 'lucide-react';

const WAHADashboardViewer: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [dashboardLoaded, setDashboardLoaded] = useState(false);

  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      authenticateToDashboard();
    }
  }, [user]);

  const authenticateToDashboard = async () => {
    setIsAuthenticating(true);
    setAuthError(null);

    try {
      // Étape 1: Authentification sur l'API WAHA
      const apiAuthResponse = await fetch('https://waha.bot.bj/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          username: 'admin',
          password: 'admin'
        })
      });

      if (!apiAuthResponse.ok) {
        throw new Error('Échec authentification API WAHA');
      }

      // Étape 2: Authentification sur le Dashboard WAHA
      const dashboardAuthResponse = await fetch('https://waha.bot.bj/dashboard/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          username: 'admin',
          password: 'admin2025'
        })
      });

      if (!dashboardAuthResponse.ok) {
        throw new Error('Échec authentification Dashboard WAHA');
      }

      setIsAuthenticated(true);
      toast({
        title: "Authentification réussie",
        description: "Connexion automatique au Dashboard WAHA établie",
      });

    } catch (error) {
      console.error('Authentication failed:', error);
      setAuthError(error instanceof Error ? error.message : 'Erreur d\'authentification');
      toast({
        title: "Erreur d'authentification",
        description: "Impossible de se connecter au Dashboard WAHA",
        variant: "destructive",
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleIframeLoad = () => {
    setDashboardLoaded(true);
  };

  const handleIframeError = () => {
    setAuthError('Erreur de chargement du dashboard');
    setDashboardLoaded(false);
  };

  const retryAuthentication = () => {
    setIsAuthenticated(false);
    setDashboardLoaded(false);
    authenticateToDashboard();
  };

  if (isAuthenticating) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold flex items-center justify-center gap-2 mb-2">
            <Shield className="w-8 h-8 text-blue-500" />
            Dashboard WAHA
          </h2>
          <p className="text-muted-foreground">
            Authentification automatique en cours...
          </p>
        </div>

        <Card>
          <CardContent className="p-8 text-center">
            <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin text-blue-500" />
            <h3 className="text-lg font-medium mb-2">Connexion au Dashboard WAHA</h3>
            <p className="text-muted-foreground mb-4">
              Authentification automatique avec les identifiants admin...
            </p>
            <div className="space-y-2 text-sm text-left max-w-md mx-auto">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                <span>Connexion API WAHA (admin/admin)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                <span>Connexion Dashboard (admin/admin2025)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (authError && !isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold flex items-center justify-center gap-2 mb-2">
            <Shield className="w-8 h-8 text-red-500" />
            Dashboard WAHA
          </h2>
          <p className="text-muted-foreground">
            Erreur de connexion au dashboard
          </p>
        </div>

        <Card className="bg-red-50 border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Erreur d'Authentification
            </CardTitle>
            <CardDescription className="text-red-600">
              {authError}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-red-600">
              <p className="mb-2">Détails de la tentative :</p>
              <ul className="list-disc list-inside space-y-1">
                <li>URL API: https://waha.bot.bj/api/auth/login</li>
                <li>URL Dashboard: https://waha.bot.bj/dashboard/auth/login</li>
                <li>Identifiants: admin / admin (API) et admin / admin2025 (Dashboard)</li>
              </ul>
            </div>
            <div className="flex gap-2">
              <Button onClick={retryAuthentication}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Réessayer
              </Button>
              <Button variant="outline" asChild>
                <a href="https://waha.bot.bj/dashboard/" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Ouvrir dans un nouvel onglet
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="max-w-full mx-auto space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold flex items-center justify-center gap-2 mb-2">
            <Shield className="w-8 h-8 text-green-500" />
            Dashboard WAHA
          </h2>
          <p className="text-muted-foreground">
            Dashboard WAHA intégré avec authentification automatique
          </p>
        </div>

        {/* Status Bar */}
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-800">Authentification Active</p>
                  <p className="text-sm text-green-600">
                    Connecté à https://waha.bot.bj/dashboard/ (admin/admin2025)
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-green-500">Connecté</Badge>
                <Button size="sm" variant="outline" onClick={retryAuthentication}>
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Actualiser
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <a href="https://waha.bot.bj/dashboard/" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Nouvel onglet
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading indicator for iframe */}
        {!dashboardLoaded && (
          <Card>
            <CardContent className="p-8 text-center">
              <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-blue-500" />
              <p className="text-muted-foreground">Chargement du Dashboard WAHA...</p>
            </CardContent>
          </Card>
        )}

        {/* Embedded Dashboard */}
        <div className="relative">
          <iframe
            src="https://waha.bot.bj/dashboard/"
            className={`w-full border rounded-lg shadow-lg transition-opacity duration-300 ${
              dashboardLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ height: '80vh', minHeight: '600px' }}
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            title="Dashboard WAHA"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation"
          />
        </div>

        {/* Footer info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <p className="text-sm text-blue-600 text-center">
              Dashboard WAHA intégré - Toutes les fonctionnalités sont disponibles directement ici
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
};

export default WAHADashboardViewer;