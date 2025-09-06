import React, { useState } from 'react';
import { AuthGuard } from '@/components/bot-management/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import WAHANativeDashboard from '@/components/whatsapp/WAHANativeDashboard';

const WhatsAppConnectPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [iframeLoading, setIframeLoading] = useState(true);

  const handleIframeLoad = () => {
    setIframeLoading(false);
  };

  const handleIframeError = () => {
    setIframeLoading(false);
  };

  return (
    <AuthGuard isAuthenticated={isAuthenticated}>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">WhatsApp Connect</h1>
            <p className="text-muted-foreground">
              Gérez vos sessions WhatsApp et configurez vos bots
            </p>
          </div>
        </div>

        <Tabs defaultValue="native" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="native">Dashboard Natif</TabsTrigger>
            <TabsTrigger value="mirror">Dashboard WAHA Complet</TabsTrigger>
          </TabsList>
          
          <TabsContent value="native" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Interface Intégrée WAHA</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Gérez vos sessions WhatsApp directement depuis notre interface
                </p>
              </CardHeader>
              <CardContent>
                <WAHANativeDashboard />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="mirror" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Dashboard WAHA Complet</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Accès complet au dashboard WAHA original via proxy sécurisé
                </p>
              </CardHeader>
              <CardContent>
                <div className="relative w-full" style={{ height: '800px' }}>
                  {iframeLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted">
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        <span>Chargement du dashboard WAHA...</span>
                      </div>
                    </div>
                  )}
                  <iframe
                    src="/functions/v1/waha-dashboard-mirror?path=/dashboard"
                    className="w-full h-full border border-border rounded-lg"
                    title="Dashboard WAHA Complet"
                    onLoad={handleIframeLoad}
                    onError={handleIframeError}
                    sandbox="allow-same-origin allow-scripts allow-forms"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AuthGuard>
  );
};

export default WhatsAppConnectPage;