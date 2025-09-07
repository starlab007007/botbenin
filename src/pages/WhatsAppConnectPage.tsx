import React, { useState } from 'react';
import { AuthGuard } from '@/components/bot-management/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { WhatsAppQRInline } from '@/components/whatsapp/WhatsAppQRInline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CompleteSessionManager from '@/components/whatsapp/CompleteSessionManager';

const WhatsAppConnectPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('inline');

  return (
    <AuthGuard isAuthenticated={isAuthenticated}>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">WhatsApp Connect</h1>
            <p className="text-muted-foreground">
              Connectez WhatsApp via notre nouvelle interface API native
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="inline">Interface API Native</TabsTrigger>
            <TabsTrigger value="advanced">Interface Avancée (Legacy)</TabsTrigger>
          </TabsList>

          <TabsContent value="inline" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Connexion WhatsApp - API Native</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Interface moderne sans iframe externe pour une connexion rapide et sécurisée
                </p>
              </CardHeader>
              <CardContent className="flex justify-center">
                <WhatsAppQRInline
                  sessionName="main_session"
                  onConnectionSuccess={() => {
                    console.log('WhatsApp connected successfully!');
                  }}
                  onConnectionFailed={(error) => {
                    console.error('WhatsApp connection failed:', error);
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-6">
            <CompleteSessionManager />
          </TabsContent>
        </Tabs>
      </div>
    </AuthGuard>
  );
};

export default WhatsAppConnectPage;