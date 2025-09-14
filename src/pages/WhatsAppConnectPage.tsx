import React, { useState, useEffect } from 'react';
import { AuthGuard } from '@/components/bot-management/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import CompleteSessionManager from '@/components/whatsapp/CompleteSessionManager';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWhatsAppAccounts } from '@/hooks/useWhatsAppAccounts';
import { useWAHADashboard } from '@/hooks/useWAHADashboard';
import { FaWhatsapp } from 'react-icons/fa';
import { MessageSquare, Users, Activity, CheckCircle2, Clock, AlertCircle, Zap, Globe, Settings } from 'lucide-react';

const WhatsAppConnectPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [showSessionManager, setShowSessionManager] = useState(false);
  const { accounts, loading: accountsLoading } = useWhatsAppAccounts();
  const { sessions, loading: sessionsLoading } = useWAHADashboard();

  // Calcul des statistiques
  const connectedSessions = sessions.filter(s => s.status === 'WORKING').length;
  const totalSessions = sessions.length;
  const activeSessions = sessions.filter(s => s.status === 'WORKING').length;
  const pendingSessions = sessions.filter(s => s.status === 'STARTING' || s.status === 'SCAN_QR_CODE').length;

  const statsData = [
    {
      label: 'Sessions Totales',
      value: totalSessions,
      icon: MessageSquare,
      color: 'text-blue-600'
    },
    {
      label: 'Sessions Actives',
      value: activeSessions,
      icon: CheckCircle2,
      color: 'text-green-600'
    },
    {
      label: 'En Attente',
      value: pendingSessions,
      icon: Clock,
      color: 'text-orange-600'
    },
    {
      label: 'Comptes Liés',
      value: accounts.length,
      icon: Users,
      color: 'text-purple-600'
    }
  ];

  return (
    <AuthGuard isAuthenticated={isAuthenticated}>
      {!showSessionManager ? (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
          {/* Header Principal */}
          <div className="border-b bg-card/50 backdrop-blur-sm">
            <div className="container mx-auto px-6 py-8">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="p-4 bg-green-100 dark:bg-green-900/20 rounded-2xl">
                    <FaWhatsapp className="h-12 w-12 text-green-600" />
                  </div>
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                    Automatisation WhatsApp IA
                  </h1>
                  <p className="text-xl text-muted-foreground mt-2">
                    Transformez votre WhatsApp en un puissant générateur de leads avec l'IA
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="container mx-auto px-6 py-8 space-y-8">
            {/* Statistiques des Sessions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {statsData.map((stat, index) => {
                const IconComponent = stat.icon;
                return (
                  <Card key={index} className="p-4">
                    <CardContent className="p-0">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg bg-muted/50`}>
                          <IconComponent className={`h-5 w-5 ${stat.color}`} />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">{stat.label}</p>
                          <p className="text-2xl font-bold">
                            {(accountsLoading || sessionsLoading) ? (
                              <span className="animate-pulse">-</span>
                            ) : (
                              stat.value
                            )}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Section Connexion WhatsApp */}
            <Card className="max-w-4xl mx-auto">
              <CardContent className="p-8">
                <div className="grid lg:grid-cols-2 gap-8 items-center">
                  {/* Partie gauche - Connexion */}
                  <div className="space-y-6">
                    <div className="flex items-center space-x-3">
                      <FaWhatsapp className="h-6 w-6 text-green-600" />
                      <h2 className="text-2xl font-bold">Connexion WhatsApp</h2>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3 p-4 bg-muted/50 rounded-lg">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                          <MessageSquare className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-medium">Scannez le QR Code</h4>
                          <p className="text-sm text-muted-foreground">
                            Connectez votre numéro WhatsApp en scannant le code QR avec votre téléphone
                          </p>
                        </div>
                      </div>
                      
                      <Button 
                        onClick={() => setShowSessionManager(true)}
                        className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-lg gap-2"
                        size="lg"
                      >
                        <FaWhatsapp className="h-5 w-5" />
                        Connecter WhatsApp
                      </Button>
                    </div>
                  </div>

                  {/* Partie droite - Fonctionnalités */}
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <Zap className="h-5 w-5 text-orange-500" />
                        Prêt à Commencer ?
                      </h3>
                      <p className="text-muted-foreground mb-6">
                        Connectez d'abord votre numéro WhatsApp pour débloquer toutes les fonctionnalités d'automatisation
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <div className="flex items-center space-x-3 p-3 border rounded-lg">
                        <Globe className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="font-medium">Webhooks</p>
                          <p className="text-sm text-muted-foreground">Déclencher des conversations</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3 p-3 border rounded-lg">
                        <Settings className="h-5 w-5 text-purple-500" />
                        <div>
                          <p className="font-medium">Widget Web</p>
                          <p className="text-sm text-muted-foreground">Bouton sur votre site</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3 p-3 border rounded-lg">
                        <Activity className="h-5 w-5 text-green-500" />
                        <div>
                          <p className="font-medium">Agents IA</p>
                          <p className="text-sm text-muted-foreground">Gérer vos bots</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <CompleteSessionManager />
      )}
    </AuthGuard>
  );
};

export default WhatsAppConnectPage;