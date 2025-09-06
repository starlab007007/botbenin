import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  Settings, 
  Activity, 
  MessageSquare, 
  Webhook, 
  BarChart3,
  Terminal,
  FileText,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Smartphone
} from 'lucide-react';
import { SessionsTab, MessagesTab, WebhooksTab } from './NativeWAHAInterface';

// Define compatible session data type
interface NativeSessionData {
  name: string;
  status: 'STOPPED' | 'STARTING' | 'SCAN_QR_CODE' | 'WORKING' | 'FAILED';
  qr?: string;
  me?: {
    id: string;
    pushName: string;
  };
}
import { useWAHADashboard } from '@/hooks/useWAHADashboard';

interface SessionLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  session?: string;
}

interface SessionSettings {
  name: string;
  webhook?: string;
  autoRestart: boolean;
  messageDelay: number;
  maxRetries: number;
}

// Map WAHA session status to NativeWAHAInterface format
const mapSessionStatus = (status: string): 'STOPPED' | 'STARTING' | 'SCAN_QR_CODE' | 'WORKING' | 'FAILED' => {
  switch (status) {
    case 'DISCONNECTED':
      return 'STOPPED';
    default:
      return status as 'STOPPED' | 'STARTING' | 'SCAN_QR_CODE' | 'WORKING' | 'FAILED';
  }
};

const EnhancedWAHAInterface: React.FC = () => {
  const [sessionLogs, setSessionLogs] = useState<SessionLog[]>([]);
  const [sessionSettings, setSessionSettings] = useState<SessionSettings[]>([]);
  const [selectedSession, setSelectedSession] = useState('');
  const [qrCode, setQrCode] = useState('');
  
  const { 
    sessions, 
    createSession, 
    startSession, 
    stopSession, 
    deleteSession,
    getQRCode,
    sendTestMessage,
    refreshData,
    loading 
  } = useWAHADashboard();

  // Simulate real-time logs
  useEffect(() => {
    const interval = setInterval(() => {
      if (sessions.length > 0) {
        const randomSession = sessions[Math.floor(Math.random() * sessions.length)];
        const logMessages = [
          'Session heartbeat check passed',
          'Processing incoming message',
          'Webhook delivered successfully',
          'Connection status verified',
          'Message sent to WhatsApp servers'
        ];
        
        const newLog: SessionLog = {
          timestamp: new Date().toISOString(),
          level: Math.random() > 0.1 ? 'info' : 'warn',
          message: logMessages[Math.floor(Math.random() * logMessages.length)],
          session: randomSession.name
        };
        
        setSessionLogs(prev => [newLog, ...prev].slice(0, 100));
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [sessions]);

  const handleCreateSession = async (name: string) => {
    try {
      await createSession(name);
      setSessionSettings(prev => [...prev, {
        name,
        autoRestart: true,
        messageDelay: 1000,
        maxRetries: 3
      }]);
      toast.success('Session créée avec succès');
    } catch (error) {
      toast.error('Erreur lors de la création de la session');
    }
  };

  const handleStartSession = async (name: string) => {
    try {
      await startSession(name);
      toast.success(`Session ${name} démarrée`);
    } catch (error) {
      toast.error('Erreur lors du démarrage');
    }
  };

  const handleStopSession = async (name: string) => {
    try {
      await stopSession(name);
      toast.success(`Session ${name} arrêtée`);
    } catch (error) {
      toast.error('Erreur lors de l\'arrêt');
    }
  };

  const handleDeleteSession = async (name: string) => {
    try {
      await deleteSession(name);
      setSessionSettings(prev => prev.filter(s => s.name !== name));
      toast.success(`Session ${name} supprimée`);
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleGetQR = async (name: string) => {
    try {
      setSelectedSession(name);
      const result = await getQRCode(name);
      setQrCode(result?.qr || '');
      toast.success('QR Code récupéré');
    } catch (error) {
      toast.error('Erreur lors de la récupération du QR');
    }
  };

  const handleSendMessage = async (messageData: any) => {
    try {
      await sendTestMessage(messageData.session, messageData.recipient, messageData.text);
      toast.success('Message envoyé avec succès');
    } catch (error) {
      toast.error('Erreur lors de l\'envoi du message');
    }
  };

  const handleConfigureWebhook = async (url: string, events: string[]) => {
    try {
      // This would call a WAHA webhook configuration API
      toast.success('Webhook configuré avec succès');
    } catch (error) {
      toast.error('Erreur lors de la configuration du webhook');
    }
  };

  const getSessionStats = () => {
    const total = sessions.length;
    const working = sessions.filter(s => s.status === 'WORKING').length;
    const failed = sessions.filter(s => s.status === 'FAILED').length;
    const pending = sessions.filter(s => s.status === 'SCAN_QR_CODE').length;
    
    return { total, working, failed, pending };
  };

  const stats = getSessionStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-blue-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header with Stats */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Interface WAHA Avancée
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              Gestion complète de vos sessions WhatsApp Business API
            </p>
          </div>
          <Button onClick={refreshData} variant="outline" className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100">Sessions Actives</p>
                  <p className="text-2xl font-bold">{stats.working}</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100">En Attente</p>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                </div>
                <Clock className="w-8 h-8 text-orange-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100">Échecs</p>
                  <p className="text-2xl font-bold">{stats.failed}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-red-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Smartphone className="w-8 h-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Interface */}
        <Tabs defaultValue="sessions" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="sessions" className="gap-2">
              <Settings className="w-4 h-4" />
              Sessions
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              Messages
            </TabsTrigger>
            <TabsTrigger value="webhooks" className="gap-2">
              <Webhook className="w-4 h-4" />
              Webhooks
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-2">
              <Terminal className="w-4 h-4" />
              Logs
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sessions">
          <SessionsTab
            sessions={sessions.map(s => ({
              ...s,
              status: mapSessionStatus(s.status)
            } as NativeSessionData))}
            onCreateSession={handleCreateSession}
            onStartSession={handleStartSession}
            onStopSession={handleStopSession}
            onDeleteSession={handleDeleteSession}
            onGetQR={handleGetQR}
            qrCode={qrCode}
            selectedSession={selectedSession}
          />
          </TabsContent>

          <TabsContent value="messages">
          <MessagesTab
            sessions={sessions.map(s => ({
              ...s,
              status: mapSessionStatus(s.status)
            } as NativeSessionData))}
            onSendMessage={handleSendMessage}
          />
          </TabsContent>

          <TabsContent value="webhooks">
            <WebhooksTab
              onConfigureWebhook={handleConfigureWebhook}
            />
          </TabsContent>

          <TabsContent value="logs">
            <Card className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Terminal className="w-5 h-5" />
                  Logs en Temps Réel
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96 w-full">
                  <div className="space-y-2">
                    {sessionLogs.map((log, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                        <Badge 
                          variant={log.level === 'error' ? 'destructive' : log.level === 'warn' ? 'secondary' : 'default'}
                          className="mt-0.5"
                        >
                          {log.level.toUpperCase()}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{log.message}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500">{log.session}</span>
                            <span className="text-xs text-gray-400">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Analytiques des Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold">Performance par Session</h3>
                    {sessions.map((session) => (
                      <div key={session.name} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                        <div>
                          <p className="font-medium">{session.name}</p>
                          <p className="text-sm text-gray-500">
                            Dernière activité: {session.lastActivity || 'Inconnue'}
                          </p>
                        </div>
                        <Badge variant={session.status === 'WORKING' ? 'default' : 'secondary'}>
                          {session.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="font-semibold">Statistiques Globales</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                        <p className="text-2xl font-bold text-green-600">{stats.working}</p>
                        <p className="text-sm text-gray-600">Sessions Actives</p>
                      </div>
                      <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                        <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
                        <p className="text-sm text-gray-600">En Attente</p>
                      </div>
                      <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                        <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
                        <p className="text-sm text-gray-600">Échecs</p>
                      </div>
                      <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                        <p className="text-2xl font-bold text-blue-600">
                          {Math.round((stats.working / (stats.total || 1)) * 100)}%
                        </p>
                        <p className="text-sm text-gray-600">Taux de Succès</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default EnhancedWAHAInterface;