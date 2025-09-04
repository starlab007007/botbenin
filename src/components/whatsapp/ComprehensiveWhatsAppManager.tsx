import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useWhatsAppAccounts } from '@/hooks/useWhatsAppAccounts';
import { useWhatsAppMessages } from '@/hooks/useWhatsAppMessages';
import { useAuth } from '@/contexts/AuthContext';
import { SessionsTab, MessagesTab, WebhooksTab } from './NativeWAHAInterface';
import { 
  MessageCircle,
  Smartphone,
  Users,
  Send,
  Trash2,
  RefreshCw,
  Download,
  Shield,
  Phone,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Settings,
  User,
  Calendar,
  Archive,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Plus,
  Eye,
  Copy,
  ExternalLink,
  QrCode,
  Zap,
  Activity,
  FileText,
  Image,
  Video,
  Mic,
  Paperclip,
  Globe,
  Webhook,
  Database,
  BarChart3,
  MessageSquare,
  Bot
} from 'lucide-react';


const ComprehensiveWhatsAppManager: React.FC = () => {
  // Authentication & Connection states
  const { user } = useAuth();
  const { accounts, loading: accountsLoading } = useWhatsAppAccounts();
  const { messages, loading: messagesLoading } = useWhatsAppMessages();
  
  // UI States
  const [activeTab, setActiveTab] = useState('sessions');
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [qrCode, setQrCode] = useState<string>('');
  const [qrRefreshing, setQrRefreshing] = useState(false);
  
  // Message & Contact states
  const [messageText, setMessageText] = useState('');
  const [recipientNumber, setRecipientNumber] = useState('');
  const [selectedContact, setSelectedContact] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [messageType, setMessageType] = useState<'text' | 'image' | 'document' | 'audio'>('text');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  
  // Session management states
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionStats, setSessionStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    pending: 0
  });
  
  // Webhook states
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookEvents, setWebhookEvents] = useState<string[]>([]);

  // Session management functions
  const handleCreateSession = async (sessionName: string) => {
    try {
      const response = await fetch('/api/waha/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: sessionName })
      });
      if (response.ok) {
        toast('Session créée avec succès');
        await loadSessions();
      }
    } catch (error) {
      toast('Erreur lors de la création de la session');
    }
  };

  const handleStartSession = async (sessionName: string) => {
    try {
      const response = await fetch(`/api/waha/sessions/${sessionName}/start`, {
        method: 'POST'
      });
      if (response.ok) {
        toast.success('Session démarrée');
        await loadSessions();
      }
    } catch (error) {
      toast.error('Erreur lors du démarrage de la session');
    }
  };

  const handleStopSession = async (sessionName: string) => {
    try {
      const response = await fetch(`/api/waha/sessions/${sessionName}/stop`, {
        method: 'POST'
      });
      if (response.ok) {
        toast.success('Session arrêtée');
        await loadSessions();
      }
    } catch (error) {
      toast.error('Erreur lors de l\'arrêt de la session');
    }
  };

  const handleDeleteSession = async (sessionName: string) => {
    try {
      const response = await fetch(`/api/waha/sessions/${sessionName}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        toast.success('Session supprimée');
        await loadSessions();
      }
    } catch (error) {
      toast.error('Erreur lors de la suppression de la session');
    }
  };

  const loadSessions = async () => {
    try {
      const response = await fetch('/api/waha/sessions');
      if (response.ok) {
        const sessionsData = await response.json();
        setSessions(sessionsData);
        
        // Update stats
        const stats = {
          total: sessionsData.length,
          active: sessionsData.filter((s: any) => s.status === 'WORKING').length,
          inactive: sessionsData.filter((s: any) => s.status === 'STOPPED').length,
          pending: sessionsData.filter((s: any) => s.status === 'STARTING').length
        };
        setSessionStats(stats);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des sessions:', error);
    }
  };

  const handleGetQRCode = async (sessionName: string) => {
    setQrRefreshing(true);
    try {
      const response = await fetch(`/api/waha/sessions/${sessionName}/auth/qr`);
      if (response.ok) {
        const data = await response.json();
        setQrCode(data.qr);
        setSelectedSession(sessionName);
      }
    } catch (error) {
      toast.error('Erreur lors de la génération du QR code');
    } finally {
      setQrRefreshing(false);
    }
  };

  const handleSendAdvancedMessage = async (messageData: any) => {
    if (!messageData.text.trim() || !messageData.recipient.trim()) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      let requestData: any = {
        session: messageData.session,
        chatId: messageData.recipient + '@c.us',
        text: messageData.text
      };

      if (messageData.type !== 'text' && messageData.file) {
        const formData = new FormData();
        formData.append('file', messageData.file);
        formData.append('session', messageData.session);
        formData.append('chatId', messageData.recipient + '@c.us');
        
        if (messageData.type === 'image') {
          formData.append('caption', messageData.text);
        }

        const response = await fetch('/api/waha/send-media', {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          toast.success('Message multimédia envoyé avec succès');
        }
      } else {
        const response = await fetch('/api/waha/send-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestData)
        });

        if (response.ok) {
          toast.success('Message envoyé avec succès');
        }
      }
    } catch (error) {
      toast.error('Erreur lors de l\'envoi du message');
    }
  };

  const handleConfigureWebhook = async (url: string, events: string[]) => {
    try {
      const response = await fetch('/api/waha/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url,
          events: events
        })
      });

      if (response.ok) {
        toast.success('Webhook configuré avec succès');
      }
    } catch (error) {
      toast.error('Erreur lors de la configuration du webhook');
    }
  };

  useEffect(() => {
    if (user) {
      loadSessions();
    }
  }, [user]);

  if (accountsLoading || messagesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 rounded-2xl p-8 mb-6">
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-display font-bold flex items-center gap-3 text-foreground mb-2">
              <div className="relative">
                <MessageCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
              </div>
              WhatsApp Business Manager
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Interface complète pour gérer vos sessions WhatsApp, messages automatisés et intégrations IA avancées
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg px-4 py-2">
              <Shield className="w-4 h-4 mr-2" />
              WAHA Connecté
            </Badge>
            <Button 
              onClick={() => window.open('https://waha.bot.bj/dashboard/', '_blank')}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg px-4 py-2 rounded-full"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Dashboard WAHA
            </Button>
            <div className="flex items-center gap-2 bg-white/80 dark:bg-black/20 backdrop-blur-sm rounded-full px-4 py-2 shadow-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-foreground">En ligne</span>
            </div>
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-blue-500/5 animate-pulse-glow"></div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6 bg-white/80 dark:bg-black/20 backdrop-blur-sm border shadow-lg p-1 rounded-xl">
          <TabsTrigger value="dashboard" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white transition-all duration-300">
            <BarChart3 className="w-4 h-4 mr-2" />
            Tableau de Bord
          </TabsTrigger>
          <TabsTrigger value="sessions" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-green-600 data-[state=active]:text-white transition-all duration-300">
            <Smartphone className="w-4 h-4 mr-2" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="messages" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-purple-600 data-[state=active]:text-white transition-all duration-300">
            <MessageSquare className="w-4 h-4 mr-2" />
            Messages
          </TabsTrigger>
          <TabsTrigger value="contacts" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-orange-600 data-[state=active]:text-white transition-all duration-300">
            <Users className="w-4 h-4 mr-2" />
            Contacts
          </TabsTrigger>
          <TabsTrigger value="bots" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white transition-all duration-300">
            <Bot className="w-4 h-4 mr-2" />
            Bots IA
          </TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-gray-500 data-[state=active]:to-gray-600 data-[state=active]:text-white transition-all duration-300">
            <Settings className="w-4 h-4 mr-2" />
            Paramètres
          </TabsTrigger>
        </TabsList>

          {/* Sessions Tab */}
          <TabsContent value="sessions" className="space-y-6">
            <SessionsTab 
              sessions={sessions}
              onCreateSession={handleCreateSession}
              onStartSession={handleStartSession}
              onStopSession={handleStopSession}
              onDeleteSession={handleDeleteSession}
              onGetQR={handleGetQRCode}
              qrCode={qrCode}
              selectedSession={selectedSession}
            />
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages" className="space-y-6">
            <MessagesTab 
              sessions={sessions.filter(s => s.status === 'WORKING')}
              onSendMessage={handleSendAdvancedMessage}
            />
          </TabsContent>

          {/* Contacts Tab */}
          <TabsContent value="contacts" className="space-y-6">
            <Card className="bg-gradient-to-br from-white to-purple-50 dark:from-gray-800 dark:to-purple-900 shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Gestion des Contacts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Fonctionnalité de gestion des contacts en cours de développement</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Media Tab */}
          <TabsContent value="media" className="space-y-6">
            <Card className="bg-gradient-to-br from-white to-green-50 dark:from-gray-800 dark:to-green-900 shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="w-5 h-5" />
                  Gestion des Médias
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Image className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Fonctionnalité de gestion des médias intégrée dans l'envoi de messages</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Webhooks Tab */}
          <TabsContent value="webhooks" className="space-y-6">
            <WebhooksTab onConfigureWebhook={handleConfigureWebhook} />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <Card className="bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-blue-900 shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Analytics WAHA
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
                    <Activity className="w-8 h-8 mx-auto text-green-500 mb-2" />
                    <p className="text-2xl font-bold">{sessionStats.active}</p>
                    <p className="text-sm text-muted-foreground">Sessions Actives</p>
                  </div>
                  <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
                    <MessageCircle className="w-8 h-8 mx-auto text-blue-500 mb-2" />
                    <p className="text-2xl font-bold">{messages?.length || 0}</p>
                    <p className="text-sm text-muted-foreground">Messages Traités</p>
                  </div>
                  <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
                    <Webhook className="w-8 h-8 mx-auto text-purple-500 mb-2" />
                    <p className="text-2xl font-bold">{webhookEvents.length}</p>
                    <p className="text-sm text-muted-foreground">Événements Webhook</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
      </Tabs>
    </div>
  );
};

export default ComprehensiveWhatsAppManager;