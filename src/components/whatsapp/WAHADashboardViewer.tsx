import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Shield,
  RefreshCw,
  CheckCircle,
  ExternalLink,
  Loader2
} from 'lucide-react';

const WAHADashboardViewer: React.FC = () => {
  const [dashboardLoaded, setDashboardLoaded] = useState(false);
  const { user } = useAuth();

  const handleIframeLoad = () => {
    setDashboardLoaded(true);
  };

  const reloadDashboard = () => {
    setDashboardLoaded(false);
    // Force reload of iframe
    const iframe = document.querySelector('iframe');
    if (iframe) {
      iframe.src = iframe.src;
    }
  };

  return (
    <div className="max-w-full mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold flex items-center justify-center gap-2 mb-2">
          <Shield className="w-8 h-8 text-green-500" />
          Dashboard WAHA
        </h2>
        <p className="text-muted-foreground">
          Dashboard WAHA intégré - https://waha.bot.bj/dashboard/
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
                  Connexion automatique avec : admin / Starlab@007
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-500">Connecté</Badge>
              <Button size="sm" variant="outline" onClick={reloadDashboard}>
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
          src="https://admin:Starlab%40007@waha.bot.bj/dashboard/"
          className={`w-full border rounded-lg shadow-lg transition-opacity duration-300 ${
            dashboardLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ height: '80vh', minHeight: '600px' }}
          onLoad={handleIframeLoad}
          title="Dashboard WAHA"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation allow-downloads"
        />
      </div>

      {/* Footer info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="text-center space-y-2">
            <p className="text-sm text-blue-600">
              Dashboard WAHA intégré - Toutes les fonctionnalités disponibles
            </p>
            <div className="text-xs text-blue-500">
              <p>URL: https://waha.bot.bj/dashboard/</p>
              <p>Utilisateur: admin | Mot de passe: Starlab@007</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WAHADashboardViewer;