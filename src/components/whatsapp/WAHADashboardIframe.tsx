import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Monitor, ExternalLink, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const WAHADashboardIframe: React.FC = () => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // URL de l'edge function qui gère l'authentification et le proxy
  const dashboardUrl = 'https://mvynepqulhflxtyymtzs.supabase.co/functions/v1/waha-dashboard-mirror';

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setError('Impossible de charger le dashboard WAHA');
    setIsLoading(false);
  };

  const openExternalDashboard = () => {
    window.open('https://waha.bot.bj/dashboard/', '_blank');
  };

  const refreshDashboard = () => {
    setIsLoading(true);
    setError(null);
    if (iframeRef.current) {
      iframeRef.current.src = dashboardUrl + '?t=' + Date.now();
    }
  };

  useEffect(() => {
    // Auto-refresh après 2 secondes si toujours en loading
    const timeout = setTimeout(() => {
      if (isLoading) {
        setError('Délai de chargement dépassé');
        setIsLoading(false);
      }
    }, 10000);

    return () => clearTimeout(timeout);
  }, [isLoading]);

  if (error) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Erreur Dashboard WAHA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}. Essayez le dashboard externe ou actualisez la page.
            </AlertDescription>
          </Alert>
          <div className="flex gap-2">
            <Button onClick={refreshDashboard} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Réessayer
            </Button>
            <Button onClick={openExternalDashboard} variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              Dashboard Externe
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Monitor className="h-5 w-5 text-primary" />
            <CardTitle>Dashboard WAHA Intégré</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {!isLoading && (
              <Badge variant="secondary" className="gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Connecté
              </Badge>
            )}
            <Button onClick={refreshDashboard} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualiser
            </Button>
            <Button onClick={openExternalDashboard} variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              Externe
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="relative h-[600px] bg-muted/10 rounded-lg overflow-hidden border">
          {isLoading && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
              <div className="text-center space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm font-medium">Connexion au dashboard WAHA...</p>
                <p className="text-xs text-muted-foreground">
                  Authentification automatique avec admin/Starlab@007
                </p>
              </div>
            </div>
          )}
          
          <iframe
            ref={iframeRef}
            src={dashboardUrl}
            className="w-full h-full border-0"
            title="Dashboard WAHA"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation allow-downloads"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            loading="eager"
          />
        </div>
        
        {/* Informations de connexion */}
        <div className="p-3 bg-muted/50 border-t">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>🌐 waha.bot.bj via Supabase Proxy</span>
              <span>👤 admin</span>
            </div>
            <span>🔒 Connexion sécurisée</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WAHADashboardIframe;