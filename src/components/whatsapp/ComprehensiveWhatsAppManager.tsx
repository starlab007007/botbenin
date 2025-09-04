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

interface Message {
  id: string;
  from: string;
  to: string;
  message: string;
  timestamp: string;
  type: 'incoming' | 'outgoing';
  status: 'sent' | 'delivered' | 'read';
}

interface Contact {
  id: string;
  name: string;
  phone: string;
  lastSeen: string;
  messagesCount: number;
}

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [messageText, setMessageText] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [messageType, setMessageType] = useState<'text' | 'image' | 'file'>('text');
  
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
    unlinkBot,
    sendMessage
  } = useWhatsAppAccounts();

  // Mock data for demonstration
  const mockMessages: Message[] = [
    {
      id: '1',
      from: '+237123456789',
      to: 'session_1',
      message: 'Bonjour, comment allez-vous?',
      timestamp: new Date().toISOString(),
      type: 'incoming',
      status: 'read'
    },
    {
      id: '2',
      from: 'session_1',
      to: '+237123456789',
      message: 'Bonjour! Je vais bien, merci. Comment puis-je vous aider?',
      timestamp: new Date().toISOString(),
      type: 'outgoing',
      status: 'delivered'
    }
  ];

  const mockContacts: Contact[] = [
    {
      id: '1',
      name: 'Client Test',
      phone: '+237123456789',
      lastSeen: '2024-01-09T10:30:00Z',
      messagesCount: 15
    },
    {
      id: '2',
      name: 'Prospect Commercial',
      phone: '+237987654321',
      lastSeen: '2024-01-09T08:15:00Z',
      messagesCount: 8
    }
  ];

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

  useEffect(() => {
    setMessages(mockMessages);
    setContacts(mockContacts);
  }, []);

  // Show auth screen first
  if (showAuth && !authCompleted) {
    return <AutoWAHAAuth onAuthComplete={handleAuthComplete} />;
  }

  if (accountsLoading) {
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MessageCircle className="w-8 h-8 text-green-500" />
            WhatsApp Business Manager
          </h1>
          <p className="text-muted-foreground">
            Gérez vos sessions WhatsApp, messages et intégrations IA
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-green-500">
            <Shield className="w-3 h-3 mr-1" />
            WAHA Connecté
          </Badge>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard">
            <BarChart3 className="w-4 h-4 mr-2" />
            Tableau de Bord
          </TabsTrigger>
          <TabsTrigger value="sessions">
            <Smartphone className="w-4 h-4 mr-2" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="messages">
            <MessageSquare className="w-4 h-4 mr-2" />
            Messages
          </TabsTrigger>
          <TabsTrigger value="contacts">
            <Users className="w-4 h-4 mr-2" />
            Contacts
          </TabsTrigger>
          <TabsTrigger value="bots">
            <Bot className="w-4 h-4 mr-2" />
            Bots IA
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="w-4 h-4 mr-2" />
            Paramètres
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Sessions Actives</p>
                    <p className="text-2xl font-bold text-green-600">{connectedSessions.length}</p>
                  </div>
                  <Smartphone className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Messages Aujourd'hui</p>
                    <p className="text-2xl font-bold text-blue-600">{messages.length}</p>
                  </div>
                  <MessageSquare className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Contacts</p>
                    <p className="text-2xl font-bold text-purple-600">{contacts.length}</p>
                  </div>
                  <Users className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Bots Actifs</p>
                    <p className="text-2xl font-bold text-orange-600">{botLinks.filter(link => link.is_active).length}</p>
                  </div>
                  <Bot className="w-8 h-8 text-orange-500" />
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
                    message.type === 'incoming' ? 'bg-muted' : 'bg-blue-50'
                  }`}>
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      message.type === 'incoming' ? 'bg-green-500' : 'bg-blue-500'
                    }`}></div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">
                          {message.type === 'incoming' ? message.from : 'Vous'}
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
                        {contact.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-medium">{contact.name}</h4>
                        <p className="text-sm text-muted-foreground">{contact.phone}</p>
                        <p className="text-xs text-muted-foreground">
                          Dernière vue: {new Date(contact.lastSeen).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{contact.messagesCount} messages</Badge>
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
              <Select value={messageType} onValueChange={(value: 'text' | 'image' | 'file') => setMessageType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Texte</SelectItem>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="file">Fichier</SelectItem>
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