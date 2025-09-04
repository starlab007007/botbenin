import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useWhatsAppAccounts } from '@/hooks/useWhatsAppAccounts';
import { useWhatsAppMessages } from '@/hooks/useWhatsAppMessages';
import { useAuth } from '@/contexts/AuthContext';
import AutoWAHAAuth from './AutoWAHAAuth';
import { 
  MessageCircle,
  Smartphone,
  QrCode,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Shield,
  Bot,
  Users,
  Send,
  Settings,
  BarChart3,
  Webhook,
  FileText,
  Phone,
  MessageSquare,
  Activity,
  Trash2,
  Edit,
  Plus,
  Eye,
  Copy
} from 'lucide-react';


const ComprehensiveWhatsAppManager: React.FC = () => {
  // State management
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showQRModal, setShowQRModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [qrCode, setQrCode] = useState<string>('');
  const [qrRefreshing, setQrRefreshing] = useState(false);
  const [showAuth, setShowAuth] = useState(true);
  const [authCompleted, setAuthCompleted] = useState(false);
  
  // Message & Contact states
  const [messageText, setMessageText] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [messageType, setMessageType] = useState<'text' | 'image' | 'document'>('text');
  
  // Session creation form
  const [newSessionName, setNewSessionName] = useState('');
  const [newSessionPhone, setNewSessionPhone] = useState('');

  const { toast } = useToast();
  const { user } = useAuth();
  
  const { 
    accounts, 
    bots,
    botLinks,
    loading: accountsLoading,
    createSession,
    startSession, 
    getQRCode,
    stopSession,
    deleteSession,
    linkBot,
    unlinkBot
  } = useWhatsAppAccounts();

  const {
    messages,
    contacts,
    loading: messagesLoading,
    sendMessage
  } = useWhatsAppMessages();


  const userSessions = accounts.filter(account => 
    account.session_name.includes(user?.id?.substring(0, 8) || '')
  );

  const connectedSessions = userSessions.filter(s => s.status === 'connected');
  const disconnectedSessions = userSessions.filter(s => s.status !== 'connected');

  // Session management functions
  const handleCreateNewSession = async () => {
    if (!newSessionName.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir un nom de session",
        variant: "destructive",
      });
      return;
    }

    try {
      await createSession(newSessionName, newSessionPhone);
      await startSession(newSessionName);
      setNewSessionName('');
      setNewSessionPhone('');
      
      // Show QR modal
      setSelectedSession(newSessionName);
      setShowQRModal(true);
      await refreshQRCode(newSessionName);
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const refreshQRCode = async (sessionName: string) => {
    setQrRefreshing(true);
    try {
      const qrCodeData = await getQRCode(sessionName);
      if (qrCodeData) {
        setQrCode(qrCodeData);
      }
    } catch (error) {
      console.error('QR code generation failed:', error);
    } finally {
      setQrRefreshing(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !recipientPhone.trim() || !selectedSession) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs",
        variant: "destructive",
      });
      return;
    }

    try {
      await sendMessage(selectedSession, recipientPhone, messageText, messageType);
      setMessageText('');
      setRecipientPhone('');
      setShowMessageModal(false);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleLinkBot = async (accountId: string) => {
    if (bots.length === 0) {
      toast({
        title: "Aucun bot disponible",
        description: "Créez d'abord un bot dans la section Bot Management",
        variant: "destructive",
      });
      return;
    }

    try {
      await linkBot(accountId, bots[0].id, 'Bonjour! Je suis votre assistant IA WhatsApp.');
      toast({
        title: "Bot connecté",
        description: "Votre bot est maintenant actif sur WhatsApp",
      });
    } catch (error) {
      console.error('Failed to link bot:', error);
    }
  };

  const handleAuthComplete = () => {
    setAuthCompleted(true);
    setShowAuth(false);
  };


  // Show auth screen first
  if (showAuth && !authCompleted) {
    return <AutoWAHAAuth onAuthComplete={handleAuthComplete} />;
  }

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

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="relative overflow-hidden bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 border-green-200 dark:border-green-800 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-700 dark:text-green-300">Sessions Actives</p>
                    <p className="text-3xl font-bold text-green-800 dark:text-green-200">{connectedSessions.length}</p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">En ligne maintenant</p>
                  </div>
                  <div className="relative">
                    <Smartphone className="w-12 h-12 text-green-600 dark:text-green-400" />
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 border-blue-200 dark:border-blue-800 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Messages Aujourd'hui</p>
                    <p className="text-3xl font-bold text-blue-800 dark:text-blue-200">{messages.length}</p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Échanges récents</p>
                  </div>
                  <MessageSquare className="w-12 h-12 text-blue-600 dark:text-blue-400" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="relative overflow-hidden bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20 border-purple-200 dark:border-purple-800 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Contacts</p>
                    <p className="text-3xl font-bold text-purple-800 dark:text-purple-200">{contacts.length}</p>
                    <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">Base de données</p>
                  </div>
                  <Users className="w-12 h-12 text-purple-600 dark:text-purple-400" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="relative overflow-hidden bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20 border-orange-200 dark:border-orange-800 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-700 dark:text-orange-300">Bots Actifs</p>
                    <p className="text-3xl font-bold text-orange-800 dark:text-orange-200">{botLinks.filter(link => link.is_active).length}</p>
                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">IA opérationnelle</p>
                  </div>
                  <div className="relative">
                    <Bot className="w-12 h-12 text-orange-600 dark:text-orange-400" />
                    {botLinks.filter(link => link.is_active).length > 0 && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full animate-pulse"></div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Activité Récente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {connectedSessions.slice(0, 3).map((session) => (
                  <div key={session.id} className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="font-medium">{session.session_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {session.phone_number || 'Connecté'} - {new Date(session.last_activity).toLocaleTimeString()}
                      </p>
                    </div>
                    <Badge className="bg-green-500">En ligne</Badge>
                  </div>
                ))}
                
                {messages.slice(0, 2).map((message) => (
                  <div key={message.id} className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                    <MessageCircle className="w-4 h-4 text-blue-500" />
                    <div className="flex-1">
                      <p className="font-medium">Nouveau message de {message.from}</p>
                      <p className="text-sm text-muted-foreground truncate">{message.message}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="space-y-6">
          {/* Create New Session */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Créer une Nouvelle Session
              </CardTitle>
              <CardDescription>
                Ajoutez une nouvelle session WhatsApp à votre compte
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Nom de la Session</label>
                  <Input 
                    placeholder="Ex: Session-Principale"
                    value={newSessionName}
                    onChange={(e) => setNewSessionName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Numéro de téléphone (optionnel)</label>
                  <Input 
                    placeholder="Ex: +237123456789"
                    value={newSessionPhone}
                    onChange={(e) => setNewSessionPhone(e.target.value)}
                  />
                </div>
              </div>
              <Button onClick={handleCreateNewSession} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Créer et Démarrer la Session
              </Button>
            </CardContent>
          </Card>

          {/* Connected Sessions */}
          {connectedSessions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  Sessions Connectées ({connectedSessions.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {connectedSessions.map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg bg-green-50">
                    <div className="flex items-center gap-4">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <div>
                        <h4 className="font-medium">{session.session_name}</h4>
                        <p className="text-sm text-green-600">
                          {session.phone_number || 'Numéro disponible après connexion'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Dernière activité: {new Date(session.last_activity).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setSelectedSession(session.session_name);
                          setShowMessageModal(true);
                        }}
                      >
                        <Send className="w-3 h-3 mr-1" />
                        Message
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => handleLinkBot(session.id)}
                        className="bg-blue-500 hover:bg-blue-600"
                      >
                        <Bot className="w-3 h-3 mr-1" />
                        Lier Bot
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => stopSession(session.session_name)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Disconnected Sessions */}
          {disconnectedSessions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-600">
                  <AlertTriangle className="w-5 h-5" />
                  Sessions à Connecter ({disconnectedSessions.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {disconnectedSessions.map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                      <div>
                        <h4 className="font-medium">{session.session_name}</h4>
                        <p className="text-sm text-muted-foreground">En attente de connexion</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm"
                        onClick={() => {
                          setSelectedSession(session.session_name);
                          setShowQRModal(true);
                          refreshQRCode(session.session_name);
                        }}
                        className="bg-blue-500 hover:bg-blue-600"
                      >
                        <QrCode className="w-3 h-3 mr-1" />
                        QR Code
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => deleteSession(session.session_name)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Messages Tab */}
        <TabsContent value="messages" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Gestionnaire de Messages</h2>
            <Button 
              onClick={() => setShowMessageModal(true)}
              disabled={connectedSessions.length === 0}
            >
              <Send className="w-4 h-4 mr-2" />
              Nouveau Message
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Messages Récents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className={`flex items-start gap-4 p-4 rounded-lg ${
                    message.direction === 'incoming' ? 'bg-muted' : 'bg-blue-50'
                  }`}>
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      message.direction === 'incoming' ? 'bg-green-500' : 'bg-blue-500'
                    }`}></div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">
                          {message.direction === 'incoming' ? message.from : 'Vous'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(message.timestamp).toLocaleString()}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {message.status}
                        </Badge>
                      </div>
                      <p className="text-sm">{message.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contacts Tab */}
        <TabsContent value="contacts" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Gestion des Contacts</h2>
            <Button onClick={() => setShowContactModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter Contact
            </Button>
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {contacts.map((contact) => (
                  <div key={contact.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
                        {(contact.name || contact.phone_number).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-medium">{contact.name || contact.phone_number}</h4>
                        <p className="text-sm text-muted-foreground">{contact.phone_number}</p>
                        <p className="text-xs text-muted-foreground">
                          Dernière vue: {new Date(contact.last_seen).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{contact.message_count} messages</Badge>
                      <Button size="sm" variant="outline">
                        <MessageSquare className="w-3 h-3 mr-1" />
                        Chat
                      </Button>
                      <Button size="sm" variant="outline">
                        <Eye className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bots Tab */}
        <TabsContent value="bots" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Intégrations IA</h2>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Bots Liés aux Sessions WhatsApp</CardTitle>
              <CardDescription>
                Gérez les bots IA connectés à vos sessions WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {botLinks.map((link) => (
                <div key={link.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <Bot className="w-8 h-8 text-blue-500" />
                    <div>
                      <h4 className="font-medium">{link.bots.name}</h4>
                      <p className="text-sm text-muted-foreground">{link.bots.description}</p>
                      <p className="text-xs text-muted-foreground">
                        Message d'accueil: {link.welcome_message}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={link.is_active ? "bg-green-500" : "bg-gray-500"}>
                      {link.is_active ? "Actif" : "Inactif"}
                    </Badge>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => unlinkBot(link.id)}
                    >
                      Délier
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bots Disponibles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {bots.map((bot) => (
                <div key={bot.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <Bot className="w-8 h-8 text-orange-500" />
                    <div>
                      <h4 className="font-medium">{bot.name}</h4>
                      <p className="text-sm text-muted-foreground">{bot.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={bot.is_active ? "bg-green-500" : "bg-gray-500"}>
                      {bot.is_active ? "Disponible" : "Inactif"}
                    </Badge>
                    {connectedSessions.length > 0 && (
                      <Select onValueChange={(sessionId) => handleLinkBot(sessionId)}>
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Lier à..." />
                        </SelectTrigger>
                        <SelectContent>
                          {connectedSessions.map((session) => (
                            <SelectItem key={session.id} value={session.id}>
                              {session.session_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <h2 className="text-2xl font-bold">Paramètres et Configuration</h2>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="w-5 h-5" />
                Configuration Webhook
              </CardTitle>
              <CardDescription>
                Configurez les webhooks pour recevoir les messages
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">URL du Webhook</label>
                <Input 
                  placeholder="https://votre-domaine.com/webhook"
                  defaultValue="https://mvynepqulhflxtyymtzs.supabase.co/functions/v1/waha-webhook"
                  readOnly
                />
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline">
                  <Copy className="w-3 h-3 mr-1" />
                  Copier
                </Button>
                <Badge className="bg-green-500">Configuré automatiquement</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Configuration WAHA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">URL WAHA</label>
                  <Input defaultValue="https://waha.bot.bj" readOnly />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Statut de connexion</label>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-500">Connecté</Badge>
                    <Button size="sm" variant="outline">Tester</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* QR Code Modal */}
      <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Scanner le QR Code</DialogTitle>
            <DialogDescription>
              Ouvrez WhatsApp sur votre téléphone et scannez ce code QR pour connecter la session "{selectedSession}"
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4">
            {qrRefreshing ? (
              <div className="flex items-center justify-center w-64 h-64 border-2 border-dashed rounded-lg">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : qrCode ? (
              <div className="p-4 bg-white rounded-lg border">
                <img src={qrCode} alt="QR Code WhatsApp" className="w-64 h-64" />
              </div>
            ) : (
              <div className="flex items-center justify-center w-64 h-64 border-2 border-dashed rounded-lg">
                <p className="text-sm text-muted-foreground">Génération du QR code...</p>
              </div>
            )}
            
            <Button 
              onClick={() => refreshQRCode(selectedSession)}
              disabled={qrRefreshing}
              className="w-full"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${qrRefreshing ? 'animate-spin' : ''}`} />
              Actualiser le QR Code
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Message Modal */}
      <Dialog open={showMessageModal} onOpenChange={setShowMessageModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Envoyer un Message</DialogTitle>
            <DialogDescription>
              Envoyez un message WhatsApp via votre session connectée
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Session</label>
              <Select value={selectedSession} onValueChange={setSelectedSession}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une session" />
                </SelectTrigger>
                <SelectContent>
                  {connectedSessions.map((session) => (
                    <SelectItem key={session.id} value={session.session_name}>
                      {session.session_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Numéro destinataire</label>
              <Input 
                placeholder="+237123456789"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Type de message</label>
              <Select value={messageType} onValueChange={(value: 'text' | 'image' | 'document') => setMessageType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Texte</SelectItem>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="document">Fichier</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Message</label>
              <Textarea 
                placeholder="Tapez votre message ici..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                rows={4}
              />
            </div>
            
            <Button onClick={handleSendMessage} className="w-full">
              <Send className="w-4 h-4 mr-2" />
              Envoyer le Message
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ComprehensiveWhatsAppManager;