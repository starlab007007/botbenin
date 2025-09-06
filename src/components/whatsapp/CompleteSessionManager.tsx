import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  Play, 
  Square, 
  RotateCcw, 
  Trash2, 
  QrCode,
  Plus,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Clock,
  Power,
  PowerOff,
  RefreshCw,
  MessageSquare,
  Settings,
  Activity,
  Loader2,
  X,
  Download,
  Copy,
  Zap,
  Users,
  Globe,
  Grid3X3,
  ArrowRightLeft,
  Search,
  Filter,
  ChevronDown,
  Bot,
  Wifi,
  WifiOff,
  BarChart3,
  Monitor
} from 'lucide-react';
import { useWAHADashboard } from '@/hooks/useWAHADashboard';

interface SessionStep {
  id: string;
  name: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  description: string;
}

interface SessionDetails {
  name: string;
  status: string;
  phoneNumber?: string;
  qrCode?: string;
  connectionTime?: string;
  lastActivity?: string;
  messagesCount?: number;
  webhookStatus?: 'connected' | 'disconnected';
}

const CompleteSessionManager: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [newSessionName, setNewSessionName] = useState('');
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSessionDetails, setShowSessionDetails] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string>('');
  const [sessionSteps, setSessionSteps] = useState<SessionStep[]>([]);
  const [sessionDetails, setSessionDetails] = useState<SessionDetails | null>(null);
  const [connectionProgress, setConnectionProgress] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [createdSession, setCreatedSession] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [userSessions, setUserSessions] = useState<string[]>([]);

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

  // État pour les sessions utilisateur depuis la base de données
  const [databaseSessions, setDatabaseSessions] = useState<any[]>([]);

  // Charger les sessions de l'utilisateur depuis la base de données avec toutes les infos
  const loadUserSessions = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('whatsapp_accounts')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Erreur lors du chargement des sessions:', error);
        return;
      }

      setDatabaseSessions(data || []);
      const sessionNames = data?.map(account => account.session_name) || [];
      setUserSessions(sessionNames);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  // Supprimer une session de la base de données
  const removeUserSession = async (sessionName: string) => {
    if (!user?.id) return;
    
    try {
      // Utiliser waha-session-manager pour supprimer de WAHA et de la DB
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Non authentifié');
        return;
      }

      const response = await supabase.functions.invoke('waha-session-manager', {
        body: {
          action: 'delete',
          sessionName: sessionName
        }
      });

      if (response.error) {
        console.error('Erreur lors de la suppression:', response.error);
        toast.error('Erreur lors de la suppression de la session');
        return;
      }

      // Recharger les sessions
      await loadUserSessions();
      await refreshData();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  // Importer une session WAHA existante qui n'est pas liée à l'utilisateur
  const importWAHASession = async (sessionName: string) => {
    if (!user?.id) return;
    
    try {
      const { error } = await supabase
        .from('whatsapp_accounts')
        .upsert({
          user_id: user.id,
          session_name: sessionName,
          status: 'disconnected'
        }, {
          onConflict: 'user_id,session_name'
        });

      if (error) {
        console.error('Erreur lors de l\'importation:', error);
        toast.error('Erreur lors de l\'importation de la session');
        return;
      }

      await loadUserSessions();
      toast.success(`Session "${sessionName}" importée avec succès`);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de l\'importation');
    }
  };

  // Fusionner les sessions de la base de données avec celles de WAHA
  const getUserFilteredSessions = () => {
    if (!user?.id) return [];
    
    // Créer une map des sessions WAHA pour un accès rapide
    const wahaSessionsMap = new Map();
    sessions.forEach(session => {
      wahaSessionsMap.set(session.name, session);
    });
    
    // Fusionner les sessions de la DB avec les infos WAHA
    const mergedSessions = databaseSessions.map(dbSession => {
      const wahaSession = wahaSessionsMap.get(dbSession.session_name);
      
      if (wahaSession) {
        // Session existe dans WAHA, utiliser ses données avec enrichissement DB
        return {
          ...wahaSession,
          databaseInfo: dbSession
        };
      } else {
        // Session n'existe que dans la DB, créer un objet compatible
        return {
          name: dbSession.session_name,
          status: dbSession.status || 'STOPPED',
          config: {
            metadata: {
              phone_number: dbSession.phone_number
            }
          },
          server: 'Database',
          lastActivity: dbSession.last_activity,
          databaseInfo: dbSession,
          isDatabaseOnly: true
        };
      }
    });
    
    return mergedSessions;
  };

  // Obtenir les sessions WAHA non importées
  const getUnimportedWAHASessions = () => {
    const userSessionNames = new Set(userSessions);
    return sessions.filter(session => !userSessionNames.has(session.name));
  };

  // Auto-refresh des sessions et détection de nouvelles sessions
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      refreshData();
    }, 5000); // Refresh toutes les 5 secondes pour une détection plus rapide

    return () => clearInterval(interval);
  }, [autoRefresh, refreshData]);

  // Charger les sessions utilisateur au démarrage et à chaque fois que l'utilisateur change
  useEffect(() => {
    if (user?.id) {
      loadUserSessions();
    }
  }, [user?.id]);

  // Mise à jour en temps réel des sessions WhatsApp
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('whatsapp_accounts_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_accounts',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Real-time update for whatsapp_accounts:', payload);
          loadUserSessions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Détection automatique des nouvelles sessions créées
  useEffect(() => {
    if (createdSession && sessions.length > 0) {
      const foundSession = sessions.find(s => s.name === createdSession);
      if (foundSession) {
        toast.success(`Session "${createdSession}" détectée et affichée automatiquement`);
        setCreatedSession(null);
      }
    }
  }, [sessions, createdSession]);

  const handleCreateSession = async () => {
    if (!newSessionName.trim()) {
      toast.error('Veuillez entrer un nom de session');
      return;
    }

    if (!isAuthenticated) {
      toast.error('Vous devez être connecté pour créer une session');
      return;
    }

    try {
      // Utiliser waha-session-manager pour créer la session et l'enregistrer en DB
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Non authentifié');
        return;
      }

      const response = await supabase.functions.invoke('waha-session-manager', {
        body: {
          action: 'create',
          sessionName: newSessionName.trim()
        }
      });

      if (response.error) {
        console.error('Erreur création session:', response.error);
        toast.error('Erreur lors de la création de la session');
        return;
      }

      setCreatedSession(newSessionName);
      setNewSessionName('');
      setShowCreateModal(false);
      
      // Recharger les données immédiatement
      await loadUserSessions();
      await refreshData();
      
      toast.success(`Session "${newSessionName}" créée et visible immédiatement!`);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la création de la session');
    }
  };

  const handleStartSession = async (sessionName: string) => {
    try {
      // Utiliser waha-session-manager pour démarrer et synchroniser le statut
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Non authentifié');
        return;
      }

      const response = await supabase.functions.invoke('waha-session-manager', {
        body: {
          action: 'start',
          sessionName: sessionName
        }
      });

      if (response.error) {
        console.error('Erreur démarrage session:', response.error);
        toast.error(`Erreur lors du démarrage de la session "${sessionName}"`);
        return;
      }

      await loadUserSessions();
      await refreshData();
      toast.success(`Session "${sessionName}" démarrée`);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error(`Erreur lors du démarrage de la session "${sessionName}"`);
    }
  };

  const handleStopSession = async (sessionName: string) => {
    try {
      // Utiliser waha-session-manager pour arrêter et synchroniser le statut
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Non authentifié');
        return;
      }

      const response = await supabase.functions.invoke('waha-session-manager', {
        body: {
          action: 'stop',
          sessionName: sessionName
        }
      });

      if (response.error) {
        console.error('Erreur arrêt session:', response.error);
        toast.error(`Erreur lors de l'arrêt de la session "${sessionName}"`);
        return;
      }

      await loadUserSessions();
      await refreshData();
      toast.success(`Session "${sessionName}" arrêtée`);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error(`Erreur lors de l'arrêt de la session "${sessionName}"`);
    }
  };

  const handleRestartSession = async (sessionName: string) => {
    try {
      await stopSession(sessionName);
      setTimeout(async () => {
        await startSession(sessionName);
        toast.success(`Session "${sessionName}" redémarrée`);
        refreshData();
      }, 1000);
    } catch (error) {
      toast.error(`Erreur lors du redémarrage de la session "${sessionName}"`);
    }
  };

  const handleDeleteSession = async (sessionName: string) => {
    try {
      await deleteSession(sessionName);
      
      // Supprimer de la base de données des sessions utilisateur
      await removeUserSession(sessionName);
      
      toast.success(`Session "${sessionName}" supprimée`);
      refreshData();
    } catch (error) {
      toast.error(`Erreur lors de la suppression de la session "${sessionName}"`);
    }
  };

  const handleDisconnectSession = async (sessionName: string) => {
    try {
      await stopSession(sessionName);
      toast.success(`Session "${sessionName}" déconnectée`);
      refreshData();
    } catch (error) {
      toast.error(`Erreur lors de la déconnexion de la session "${sessionName}"`);
    }
  };

  const handleConnectWhatsApp = async (sessionName: string) => {
    try {
      setSelectedSession(sessionName);
      setShowQRModal(true);
      
      // Utiliser waha-session-manager pour obtenir le QR code
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Non authentifié');
        return;
      }

      const response = await supabase.functions.invoke('waha-session-manager', {
        body: {
          action: 'qr',
          sessionName: sessionName
        }
      });

      if (response.error) {
        console.error('Erreur génération QR:', response.error);
        toast.error('Erreur lors de la génération du QR code');
        return;
      }

      setQrCodeData(response.data?.qrCode || '');
      await loadUserSessions(); // Mettre à jour le QR code en DB
      toast.success('QR Code généré pour la connexion WhatsApp');
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la génération du QR code');
    }
  };

  const handleViewDetails = (sessionName: string) => {
    const session = sessions.find(s => s.name === sessionName);
    if (session) {
      setSelectedSession(sessionName);
      setSessionDetails({
        name: session.name,
        status: session.status,
        phoneNumber: session.config?.metadata?.phone_number,
      });
      setShowSessionDetails(true);
    }
  };

  const toggleSessionExpansion = (sessionName: string) => {
    setExpandedSession(expandedSession === sessionName ? null : sessionName);
  };

  // Obtenir les sessions filtrées de l'utilisateur
  const userFilteredSessions = getUserFilteredSessions();

  const filteredSessions = userFilteredSessions.filter(session =>
    session.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    session.config?.metadata?.phone_number?.includes(searchTerm)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header moderne */}
      <div className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">WhatsApp Connect</h1>
                  <p className="text-sm text-muted-foreground">Gérez vos sessions WhatsApp Business en toute simplicité</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`gap-2 ${autoRefresh ? 'text-primary border-primary' : ''}`}
              >
                <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                Auto-refresh
              </Button>
              
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 shadow-lg"
              >
                <Plus className="h-4 w-4" />
                Nouvelle Session
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6">
        {/* Stats rapides */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-0 shadow-sm bg-gradient-to-r from-green-500/10 to-green-600/10 border-green-200/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sessions Actives</p>
                  <p className="text-2xl font-bold text-green-600">
                    {userFilteredSessions.filter(s => s.status === 'WORKING').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-sm bg-gradient-to-r from-orange-500/10 to-orange-600/10 border-orange-200/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/20 rounded-lg">
                  <QrCode className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">En Attente QR</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {userFilteredSessions.filter(s => s.status === 'SCAN_QR_CODE').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-sm bg-gradient-to-r from-slate-500/10 to-slate-600/10 border-slate-200/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-500/20 rounded-lg">
                  <PowerOff className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Arrêtées</p>
                  <p className="text-2xl font-bold text-slate-600">
                    {userFilteredSessions.filter(s => s.status === 'STOPPED').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-500/10 to-blue-600/10 border-blue-200/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Activity className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold text-blue-600">{userFilteredSessions.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Interface de gestion des sessions - Style WAHA Dashboard */}
        <Card className="border-0 shadow-xl bg-card/60 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Smartphone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">Sessions WhatsApp</CardTitle>
                  <p className="text-sm text-muted-foreground">Interface WAHA Dashboard - Gestion complète</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-green-600 hover:bg-green-700 text-white gap-2 shadow-lg"
                >
                  <Play className="h-4 w-4" />
                  Start New
                </Button>
                
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by Name, Phone"
                    className="pl-9 w-64 bg-background/60"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button variant="outline" size="sm" className="gap-2">
                  Columns
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center p-12">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="text-muted-foreground">Chargement des sessions...</span>
                </div>
              </div>
            ) : userFilteredSessions.length === 0 ? (
              <div className="space-y-8">
                <div className="text-center py-12">
                  <div className="mb-4">
                    <div className="mx-auto w-24 h-24 bg-muted/50 rounded-full flex items-center justify-center">
                      <MessageSquare className="h-12 w-12 text-muted-foreground" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Aucune session WhatsApp</h3>
                  <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                    Commencez par créer votre première session WhatsApp pour connecter votre compte business.
                  </p>
                  <Button onClick={() => setShowCreateModal(true)} className="gap-2">
                    <Play className="h-4 w-4" />
                    Start New
                  </Button>
                </div>

                {/* Afficher les sessions WAHA non importées */}
                {getUnimportedWAHASessions().length > 0 && (
                  <div className="border-t pt-6">
                    <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      Sessions WAHA disponibles à importer
                    </h4>
                    <div className="space-y-2">
                      {getUnimportedWAHASessions().map((session) => (
                        <div key={session.name} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/20 rounded-lg">
                              <Bot className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <div className="font-medium">{session.name}</div>
                              <div className="text-sm text-muted-foreground">Statut: {session.status}</div>
                            </div>
                          </div>
                          <Button
                            onClick={() => importWAHASession(session.name)}
                            size="sm"
                            variant="outline"
                            className="gap-2 border-blue-200 text-blue-600 hover:bg-blue-50"
                          >
                            <Download className="h-4 w-4" />
                            Importer
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredSessions.map((session, index) => (
                  <div 
                    key={session.name} 
                    className="bg-background/40 rounded-xl border border-border/60 hover:border-primary/30 transition-all duration-300 overflow-hidden"
                  >
                    {/* En-tête de session cliquable */}
                    <div 
                      className="p-4 cursor-pointer hover:bg-muted/20 transition-colors"
                      onClick={() => toggleSessionExpansion(session.name)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {/* Indicateur de statut */}
                          <div className={`p-2 rounded-lg ${
                            session.status === 'WORKING' ? 'bg-green-500/20 border border-green-500/30' :
                            session.status === 'SCAN_QR_CODE' ? 'bg-orange-500/20 border border-orange-500/30' :
                            session.status === 'STOPPED' ? 'bg-slate-500/20 border border-slate-500/30' :
                            'bg-red-500/20 border border-red-500/30'
                          }`}>
                            {session.status === 'WORKING' ? 
                              <Wifi className="h-5 w-5 text-green-600" /> :
                              session.status === 'SCAN_QR_CODE' ? 
                              <QrCode className="h-5 w-5 text-orange-600" /> :
                              session.status === 'STOPPED' ?
                              <PowerOff className="h-5 w-5 text-slate-600" /> :
                              <WifiOff className="h-5 w-5 text-red-600" />
                            }
                          </div>
                          
                          {/* Informations de session */}
                            <div>
                              <div className="flex items-center gap-3 mb-1">
                                <h3 className="text-lg font-semibold">{session.name}</h3>
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs ${
                                    session.status === 'WORKING' ? 'bg-green-500/10 border-green-500/30 text-green-600' :
                                    session.status === 'FAILED' ? 'bg-red-500/10 border-red-500/30 text-red-600' :
                                    session.status === 'SCAN_QR_CODE' ? 'bg-orange-500/10 border-orange-500/30 text-orange-600' :
                                    session.status === 'STOPPED' ? 'bg-slate-500/10 border-slate-500/30 text-slate-600' :
                                    'bg-slate-500/10 border-slate-500/30 text-slate-600'
                                  }`}
                                >
                                  {session.status === 'WORKING' ? 'Connecté' :
                                   session.status === 'SCAN_QR_CODE' ? 'QR Code requis' :
                                   session.status === 'STOPPED' ? 'Arrêté' :
                                   'Déconnecté'}
                                </Badge>
                                {session.isDatabaseOnly && (
                                  <Badge variant="outline" className="text-xs bg-blue-500/10 border-blue-500/30 text-blue-600">
                                    Base de données
                                  </Badge>
                                )}
                              </div>
                            
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              {session.config?.metadata?.phone_number ? (
                                <div className="flex items-center gap-2">
                                  <Smartphone className="h-4 w-4" />
                                  <span className="font-medium text-foreground">
                                    {session.config.metadata.phone_number}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">Numéro non configuré</span>
                              )}
                              
                              <div className="flex items-center gap-2">
                                <Monitor className="h-4 w-4" />
                                <span>WAHA Server</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Action rapide et chevron */}
                        <div className="flex items-center gap-3">
                          {/* Action rapide principale */}
                          {session.status === 'STOPPED' ? (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartSession(session.name);
                              }}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white gap-2"
                            >
                              <Play className="h-4 w-4" />
                              Démarrer
                            </Button>
                          ) : session.status === 'SCAN_QR_CODE' ? (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleConnectWhatsApp(session.name);
                              }}
                              size="sm"
                              className="bg-orange-600 hover:bg-orange-700 text-white gap-2"
                            >
                              <QrCode className="h-4 w-4" />
                              Scanner QR
                            </Button>
                          ) : session.status === 'WORKING' ? (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStopSession(session.name);
                              }}
                              size="sm"
                              variant="outline"
                              className="gap-2 border-red-200 text-red-600 hover:bg-red-50"
                            >
                              <Square className="h-4 w-4" />
                              Arrêter
                            </Button>
                          ) : (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRestartSession(session.name);
                              }}
                              size="sm"
                              variant="outline"
                              className="gap-2"
                            >
                              <RotateCcw className="h-4 w-4" />
                              Relancer
                            </Button>
                          )}

                          {/* Chevron pour expansion */}
                          <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${
                            expandedSession === session.name ? 'rotate-180' : ''
                          }`} />
                        </div>
                      </div>
                    </div>

                    {/* Panel d'actions détaillées (expandable) */}
                    {expandedSession === session.name && (
                      <div className="border-t border-border/40 bg-muted/5">
                        <div className="p-6 space-y-4">
                          {/* Informations détaillées */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-muted-foreground">Statut de connexion</label>
                              <div className="flex items-center gap-2">
                                <div className={`h-3 w-3 rounded-full ${
                                  session.status === 'WORKING' ? 'bg-green-500' :
                                  session.status === 'SCAN_QR_CODE' ? 'bg-orange-500' :
                                  session.status === 'STOPPED' ? 'bg-slate-500' :
                                  'bg-red-500'
                                }`} />
                                <span className="text-sm font-medium">{session.status}</span>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-muted-foreground">Compte WhatsApp</label>
                              <div className="text-sm">
                                {session.config?.metadata?.phone_number || 'Non configuré'}
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-muted-foreground">Serveur</label>
                              <Badge className="bg-blue-500/10 border-blue-500/30 text-blue-500 text-xs">
                                WAHA Server
                              </Badge>
                            </div>
                          </div>

                          <Separator />

                          {/* Actions de session */}
                          <div className="space-y-4">
                            <h4 className="text-sm font-semibold">Actions de session</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              {/* Démarrer/Arrêter */}
                              <Button
                                onClick={() => session.status === 'STOPPED' ? handleStartSession(session.name) : handleStopSession(session.name)}
                                variant="outline"
                                className={`gap-2 ${
                                  session.status === 'WORKING'
                                    ? 'border-red-200 text-red-600 hover:bg-red-50'
                                    : 'border-green-200 text-green-600 hover:bg-green-50'
                                }`}
                              >
                                {session.status === 'WORKING' ? 
                                  <Square className="h-4 w-4" /> : 
                                  <Play className="h-4 w-4" />
                                }
                                {session.status === 'WORKING' ? 'Arrêter' : 'Démarrer'}
                              </Button>

                              {/* Redémarrer */}
                              <Button
                                onClick={() => handleRestartSession(session.name)}
                                variant="outline"
                                className="gap-2"
                              >
                                <RotateCcw className="h-4 w-4" />
                                Redémarrer
                              </Button>

                              {/* QR Code */}
                              <Button
                                onClick={() => handleConnectWhatsApp(session.name)}
                                variant="outline"
                                className="gap-2 border-orange-200 text-orange-600 hover:bg-orange-50"
                              >
                                <QrCode className="h-4 w-4" />
                                QR Code
                              </Button>

                              {/* Détails */}
                              <Button
                                onClick={() => handleViewDetails(session.name)}
                                variant="outline"
                                className="gap-2"
                              >
                                <Settings className="h-4 w-4" />
                                Détails
                              </Button>
                            </div>
                          </div>

                          <Separator />

                          {/* Actions avancées */}
                          <div className="space-y-4">
                            <h4 className="text-sm font-semibold">Actions avancées</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              {/* Analytics */}
                              <Button
                                variant="outline"
                                className="gap-2 border-blue-200 text-blue-600 hover:bg-blue-50"
                              >
                                <BarChart3 className="h-4 w-4" />
                                Analytics
                              </Button>

                              {/* Export */}
                              <Button
                                variant="outline"
                                className="gap-2"
                              >
                                <Download className="h-4 w-4" />
                                Exporter
                              </Button>

                              {/* Copier */}
                              <Button
                                variant="outline"
                                className="gap-2"
                              >
                                <Copy className="h-4 w-4" />
                                Copier
                              </Button>

                              {/* Supprimer */}
                              <Button
                                onClick={() => handleDeleteSession(session.name)}
                                variant="outline"
                                className="gap-2 border-red-200 text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                                Supprimer
                              </Button>
                            </div>
                          </div>

                          {/* Messages de test (si connecté) */}
                          {session.status === 'WORKING' && (
                            <>
                              <Separator />
                              <div className="space-y-4">
                                <h4 className="text-sm font-semibold">Test de messages</h4>
                                <div className="flex gap-3">
                                  <Button
                                    variant="outline"
                                    className="gap-2 border-green-200 text-green-600 hover:bg-green-50"
                                  >
                                    <MessageSquare className="h-4 w-4" />
                                    Envoyer un test
                                  </Button>
                                  <Button
                                    variant="outline"
                                    className="gap-2"
                                  >
                                    <Activity className="h-4 w-4" />
                                    Voir historique
                                  </Button>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {filteredSessions.length === 0 && searchTerm && (
                  <div className="text-center py-8">
                    <div className="text-muted-foreground">
                      Aucune session trouvée pour "{searchTerm}"
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions rapides */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => setShowCreateModal(true)}>
            <CardContent className="p-6 text-center">
              <div className="mb-4">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Plus className="h-6 w-6 text-primary" />
                </div>
              </div>
              <h3 className="font-semibold mb-2">Nouvelle Session</h3>
              <p className="text-sm text-muted-foreground">Créer une nouvelle connexion WhatsApp</p>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <div className="mb-4">
                <div className="mx-auto w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                  <Settings className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <h3 className="font-semibold mb-2">Configuration</h3>
              <p className="text-sm text-muted-foreground">Gérer les paramètres avancés</p>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <div className="mb-4">
                <div className="mx-auto w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
                  <Activity className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <h3 className="font-semibold mb-2">Analytics</h3>
              <p className="text-sm text-muted-foreground">Voir les statistiques d'usage</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modales */}
      {/* Modal de création de session */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Plus className="h-5 w-5 text-primary" />
              </div>
              Créer une nouvelle session
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nom de la session</label>
              <Input
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
                placeholder="ex: session-principale"
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Utilisez un nom unique et descriptif pour votre session
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Annuler
              </Button>
              <Button onClick={handleCreateSession} disabled={!newSessionName.trim()}>
                Créer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal QR Code */}
      <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <QrCode className="h-5 w-5 text-orange-600" />
              </div>
              Scanner le QR Code - {selectedSession}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {qrCodeData ? (
              <div className="text-center space-y-4">
                <div className="mx-auto p-4 bg-white rounded-xl inline-block">
                  <img src={qrCodeData} alt="QR Code" className="w-64 h-64 mx-auto" />
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    1. Ouvrez WhatsApp sur votre téléphone
                  </p>
                  <p className="text-sm text-muted-foreground">
                    2. Allez dans Paramètres → Appareils liés
                  </p>
                  <p className="text-sm text-muted-foreground">
                    3. Scannez ce QR code avec votre téléphone
                  </p>
                </div>
                <Button onClick={() => handleConnectWhatsApp(selectedSession)} variant="outline" className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Actualiser QR Code
                </Button>
              </div>
            ) : (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground">Génération du QR Code...</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal détails de session */}
      <Dialog open={showSessionDetails} onOpenChange={setShowSessionDetails}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Activity className="h-5 w-5 text-blue-600" />
              </div>
              Détails de la session - {sessionDetails?.name}
            </DialogTitle>
          </DialogHeader>
          {sessionDetails && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Statut</label>
                  <Badge 
                    className={`${
                      sessionDetails.status === 'WORKING' ? 'bg-green-500/10 border-green-500/30 text-green-600' :
                      sessionDetails.status === 'SCAN_QR_CODE' ? 'bg-orange-500/10 border-orange-500/30 text-orange-600' :
                      'bg-slate-500/10 border-slate-500/30 text-slate-600'
                    }`}
                  >
                    {sessionDetails.status}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Numéro de téléphone</label>
                  <p className="text-sm font-mono">
                    {sessionDetails.phoneNumber || 'Non configuré'}
                  </p>
                </div>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-blue-600">WAHA</div>
                  <p className="text-sm text-muted-foreground">Type de serveur</p>
                </div>
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-green-600">API</div>
                  <p className="text-sm text-muted-foreground">Mode d'accès</p>
                </div>
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-primary">Active</div>
                  <p className="text-sm text-muted-foreground">Session</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CompleteSessionManager;