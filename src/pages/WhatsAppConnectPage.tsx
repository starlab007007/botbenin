import React, { useState } from 'react';
import { AuthGuard } from '@/components/bot-management/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CompleteSessionManager from '@/components/whatsapp/CompleteSessionManager';
import WAHADashboardIframe from '@/components/whatsapp/WAHADashboardIframe';

const WhatsAppConnectPage: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <AuthGuard isAuthenticated={isAuthenticated}>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">WhatsApp Connect</h1>
            <p className="text-muted-foreground">
              Interface WAHA Avancée - Gérez vos sessions WhatsApp
            </p>
          </div>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dashboard" className="gap-2">
              📊 Dashboard WAHA Intégré
            </TabsTrigger>
            <TabsTrigger value="sessions" className="gap-2">
              ⚙️ Gestionnaire de Sessions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <WAHADashboardIframe />
          </TabsContent>

          <TabsContent value="sessions" className="space-y-6">
            <CompleteSessionManager />
          </TabsContent>
        </Tabs>
      </div>
    </AuthGuard>
  );
};

export default WhatsAppConnectPage;