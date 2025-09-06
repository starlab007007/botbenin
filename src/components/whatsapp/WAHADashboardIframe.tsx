import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Monitor, ExternalLink, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const WAHADashboardIframe: React.FC = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [sessions, setSessions] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);

  const fetchWAHAData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!user) {
        throw new Error('Utilisateur non authentifié');
      }

      // Utiliser l'edge function waha-dashboard-proxy directement
      const { data, error: functionError } = await supabase.functions.invoke('waha-dashboard-proxy', {
        body: { action: 'sessions' },
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        }
      });

      if (functionError) {
        throw new Error(`Erreur fonction: ${functionError.message}`);
      }

      if (data.sessions) {
        setSessions(data.sessions);
        setDashboardData(data);
      }

    } catch (err: any) {
      console.error('Erreur lors du chargement du dashboard WAHA:', err);
      setError(err.message || 'Erreur de connexion au dashboard WAHA');
    } finally {
      setIsLoading(false);
    }
  };

  const openExternalDashboard = () => {
    window.open('https://waha.bot.bj/dashboard/', '_blank');
  };

  useEffect(() => {
    fetchWAHAData();
  }, [user]);

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-[500px]">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-sm font-medium">Chargement du dashboard WAHA...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

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
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchWAHAData} variant="outline" size="sm">
              <Loader2 className="h-4 w-4 mr-2" />
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
            <CardTitle>Dashboard WAHA Natif</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Connecté
            </Badge>
            <Button onClick={openExternalDashboard} variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              Dashboard Externe
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {sessions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Monitor className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucune session WAHA active</p>
            <Button onClick={fetchWAHAData} variant="outline" size="sm" className="mt-2">
              <Loader2 className="h-4 w-4 mr-2" />
              Actualiser
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Sessions WhatsApp ({sessions.length})</h3>
              <Button onClick={fetchWAHAData} variant="outline" size="sm">
                <Loader2 className="h-4 w-4 mr-2" />
                Actualiser
              </Button>
            </div>
            
            <div className="grid gap-4">
              {sessions.map((session: any, index: number) => (
                <Card key={session.name || index} className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h4 className="font-medium">{session.name}</h4>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Status: {session.status || 'Unknown'}</span>
                          {session.engine && <span>Engine: {session.engine}</span>}
                          {session.webhook && <span>Webhook: Configuré</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={session.status === 'WORKING' ? 'default' : 'secondary'}
                          className="gap-1"
                        >
                          <div className={`w-2 h-2 rounded-full ${
                            session.status === 'WORKING' ? 'bg-green-500' : 'bg-gray-500'
                          }`} />
                          {session.status || 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
        
        {/* Informations de connexion */}
        <div className="p-4 bg-muted/50 border rounded-lg">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>🌐 API WAHA via Supabase</span>
              <span>🔑 Authentification automatique</span>
            </div>
            <span>🔒 Connexion sécurisée</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WAHADashboardIframe;