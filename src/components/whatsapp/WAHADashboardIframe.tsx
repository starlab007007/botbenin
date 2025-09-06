import React, { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Monitor } from 'lucide-react';

const WAHADashboardIframe: React.FC = () => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Use the Supabase edge function proxy instead of direct URL
  const dashboardUrl = 'https://mvynepqulhflxtyymtzs.supabase.co/functions/v1/waha-dashboard-mirror';

  // The edge function handles authentication automatically

  return (
    <>
      <style>
        {`
          .animate-fade-out {
            animation: fadeOut 3s ease-out 2s forwards;
          }
          
          @keyframes fadeOut {
            to {
              opacity: 0;
              pointer-events: none;
            }
          }
        `}
      </style>
      
      <Card className="h-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Monitor className="h-5 w-5 text-primary" />
            <CardTitle>Dashboard WAHA Intégré</CardTitle>
          </div>
          <Badge variant="secondary" className="gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Connecté
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="relative h-[800px] bg-muted/10 rounded-lg overflow-hidden border">
          <iframe
            ref={iframeRef}
            src={dashboardUrl}
            className="w-full h-full border-0"
            title="Dashboard WAHA"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation"
            loading="lazy"
          />
          
          {/* Overlay de connexion automatique */}
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center opacity-100 transition-opacity duration-1000 pointer-events-none animate-fade-out">
            <div className="text-center space-y-3">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-medium">Connexion automatique au dashboard WAHA...</p>
              <p className="text-xs text-muted-foreground">Via proxy sécurisé</p>
            </div>
          </div>
        </div>
        
        {/* Informations de connexion */}
        <div className="p-4 bg-muted/50 border-t">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>🌐 Proxy sécurisé via Supabase</span>
              <span>🔑 Authentification automatique</span>
            </div>
            <span>🔒 Connexion sécurisée</span>
          </div>
        </div>
      </CardContent>
      </Card>
    </>
  );
};

export default WAHADashboardIframe;