import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Shield,
  RefreshCw,
  CheckCircle,
  ExternalLink,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const WAHADashboardViewer: React.FC = () => {
  const [dashboardLoaded, setDashboardLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleIframeLoad = () => {
    setDashboardLoaded(true);
    setLoading(false);
  };

  const handleIframeError = () => {
    setError('Impossible de charger le dashboard WAHA');
    setLoading(false);
  };

  const reloadDashboard = () => {
    setDashboardLoaded(false);
    setLoading(true);
    setError('');
    // Force reload of iframe
    const iframe = document.querySelector('iframe');
    if (iframe) {
      iframe.src = iframe.src;
    }
  };

  // Use proxy Edge Function URL for secure access
  const getProxyUrl = () => {
    const projectId = 'mvynepqulhflxtyymtzs';
    return `https://${projectId}.supabase.co/functions/v1/waha-proxy?path=/dashboard`;
  };

  const openExternalDashboard = async () => {
    // Open via proxy for security
    window.open('https://waha.bot.bj/dashboard/', '_blank');
  };

  return (
    <div className="max-w-full mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold flex items-center justify-center gap-2 mb-2">
          <Shield className="w-8 h-8 text-green-500" />
          Dashboard WAHA
        </h2>
        <p className="text-muted-foreground">
          Dashboard WAHA intégré via proxy sécurisé
        </p>
      </div>

      {/* Status Bar */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-medium text-green-800">Dashboard WAHA Actif</p>
                <p className="text-sm text-green-600">
                  Connexion sécurisée via Edge Function proxy
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-500">Sécurisé</Badge>
              <Button size="sm" variant="outline" onClick={reloadDashboard} disabled={loading}>
                <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
              <Button size="sm" variant="outline" onClick={openExternalDashboard}>
                <ExternalLink className="w-3 h-3 mr-1" />
                Nouvel onglet
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <div>
                <p className="font-medium text-red-800">Erreur de chargement</p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
              <Button size="sm" variant="outline" onClick={reloadDashboard} className="ml-auto">
                <RefreshCw className="w-3 h-3 mr-1" />
                Réessayer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading indicator for iframe */}
      {!dashboardLoaded && !error && (
        <Card>
          <CardContent className="p-8 text-center">
            <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-blue-500" />
            <p className="text-muted-foreground">Chargement du Dashboard WAHA...</p>
          </CardContent>
        </Card>
      )}

      {/* Embedded Dashboard via Proxy */}
      <div className="relative">
        <iframe
          src={getProxyUrl()}
          className={`w-full border rounded-lg shadow-lg transition-opacity duration-300 ${
            dashboardLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ height: '80vh', minHeight: '600px' }}
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          title="Dashboard WAHA"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation allow-downloads"
        />
      </div>

      {/* Footer info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="text-center space-y-2">
            <p className="text-sm text-blue-600">
              Dashboard WAHA intégré via proxy sécurisé - Credentials gérés côté serveur
            </p>
            <div className="text-xs text-blue-500">
              <p>URL: https://waha.bot.bj/dashboard/</p>
              <p>Authentification: Gérée par Edge Function (secrets Supabase)</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WAHADashboardViewer;
