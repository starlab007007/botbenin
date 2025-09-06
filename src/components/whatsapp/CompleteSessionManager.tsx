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
import { FaWhatsapp } from 'react-icons/fa';
import { useWAHADashboard, WAHASession } from '@/hooks/useWAHADashboard';

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
  const [userSessionsFromDB, setUserSessionsFromDB] = useState<any[]>([]);

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

  // Sauvegarder une session dans la base de données
  const saveUserSession = async (sessionName: string) => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('whatsapp_accounts')
        .upsert({
          user_id: user.id,
          session_name: sessionName,
          status: 'disconnected'
        }, {
          onConflict: 'user_id,session_name'
        });

      if (error) {
        console.error('Erreur lors de la sauvegarde de la session:', error);
        toast.error('Erreur lors de la sauvegarde de la session');
        return;
      }

      // Recharger les sessions utilisateur
      await loadUserSessions();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  // Charger les sessions de l'utilisateur depuis la base de données
  const loadUserSessions = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('whatsapp_accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur lors du chargement des sessions:', error);
        return;
      }

      const sessionNames = data?.map(account => account.session_name) || [];
      setUserSessions(sessionNames);
      setUserSessionsFromDB(data || []);
      
      console.log('✅ Sessions chargées depuis Supabase:', sessionNames);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  // Supprimer une session de la base de données
  const removeUserSession = async (sessionName: string) => {
    if (!user?.id) return;
    
    try {
      const { error } = await supabase
        .from('whatsapp_accounts')
        .delete()
        .eq('user_id', user.id)
        .eq('session_name', sessionName);

      if (error) {
        console.error('Erreur lors de la suppression:', error);
        return;
      }

      // Recharger les sessions
      await loadUserSessions();
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  // Créer les sessions à afficher en combinant Supabase et WAHA
  const getUserFilteredSessions = () => {
    if (!user?.id) return [];
    
    // Créer des sessions hybrides à partir des données Supabase et WAHA
    const hybridSessions: WAHASession[] = [];
    
    // D'abord, ajouter toutes les sessions depuis Supabase
    userSessionsFromDB.forEach(dbSession => {
      // Chercher si cette session existe aussi dans WAHA
      const wahaSession = sessions.find(s => s.name === dbSession.session_name);
      
      if (wahaSession) {
        // Session existe dans WAHA, utiliser les données WAHA enrichies
        hybridSessions.push({
          ...wahaSession,
          status: wahaSession.status || 'STOPPED',
          metadata: {
            ...wahaSession.metadata,
            dbStatus: dbSession.status,
            createdAt: dbSession.created_at
          }
        });
      } else {
        // Session existe seulement en base, créer une session virtuelle
        hybridSessions.push({
          name: dbSession.session_name,
          status: 'STOPPED',
          config: {},
          server: 'local',
          metadata: {
            dbStatus: dbSession.status,
            createdAt: dbSession.created_at,
            isFromDB: true
          }
        });
      }
    });
    
    // Ajouter les sessions nouvellement créées qui ne sont pas encore en base
    if (createdSession) {
      const existsInHybrid = hybridSessions.some(s => s.name === createdSession);
      if (!existsInHybrid) {
        const wahaSession = sessions.find(s => s.name === createdSession);
        if (wahaSession) {
          hybridSessions.push({
            ...wahaSession,
            metadata: {
              ...wahaSession.metadata,
              isJustCreated: true
            }
          });
        }
      }
    }
    
    return hybridSessions;
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

  // Aussi charger quand les sessions WAHA changent pour s'assurer qu'on voit les nouvelles
  useEffect(() => {
    if (user?.id && sessions.length > 0) {
      loadUserSessions();
    }
  }, [sessions, user?.id]);

  // Détection automatique des nouvelles sessions créées
  useEffect(() => {
    if (createdSession && sessions.length > 0) {
      const foundSession = sessions.find(s => s.name === createdSession);
      if (foundSession) {
        toast.success(`🎉 Session "${createdSession}" détectée et affichée! Prête à démarrer.`);
        // Ne pas réinitialiser immédiatement pour laisser le temps de voir la session
        setTimeout(() => setCreatedSession(null), 10000); // 10 secondes
      }
    }
  }, [sessions, createdSession]);

  const handleCreateSession = async () => {
    if (!newSessionName.trim()) {
      toast.error('Veuillez entrer un nom de session');
      return;
    }

    try {
      // Sauvegarder d'abord dans la base de données pour affichage immédiat
      await saveUserSession(newSessionName);
      
      // Marquer comme session créée pour affichage immédiat
      setCreatedSession(newSessionName);
      setNewSessionName('');
      setShowCreateModal(false);
      
      // Recharger les sessions depuis Supabase immédiatement
      await loadUserSessions();
      
      toast.success(`✅ Session "${newSessionName}" créée et visible! Cliquez sur Démarrer pour l'activer.`);
      
      // Essayer de créer la session sur WAHA en arrière-plan
      try {
        await createSession(newSessionName);
        // Synchroniser après création WAHA
        setTimeout(() => refreshData(), 1000);
      } catch (wahaError) {
        console.warn('Session créée en base mais pas encore sur WAHA:', wahaError);
      }
      
    } catch (error) {
      console.error('Erreur création session:', error);
      toast.error('Erreur lors de la création de la session');
    }
  };

  const handleStartSession = async (sessionName: string) => {
    try {
      await startSession(sessionName);
      toast.success(`Session "${sessionName}" démarrée`);
      refreshData();
    } catch (error) {
      toast.error(`Erreur lors du démarrage de la session "${sessionName}"`);
    }
  };

  const handleStopSession = async (sessionName: string) => {
    try {
      await stopSession(sessionName);
      toast.success(`Session "${sessionName}" arrêtée`);
      refreshData();
    } catch (error) {
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
      const qr = await getQRCode(sessionName);
      setQrCodeData(qr.qr);
      toast.success('QR Code généré pour la connexion WhatsApp');
    } catch (error) {
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
                <Button onClick={() => setShowCreateModal(true)} size="lg" className="gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3">
                  <Play className="h-5 w-5" />
                  🚀 Start New
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                  {filteredSessions.map((session, index) => (
                    <div 
                      key={session.name} 
                      className={`bg-background/40 rounded-xl border transition-all duration-300 overflow-hidden ${
                        createdSession === session.name 
                          ? 'border-green-400/50 shadow-lg shadow-green-400/20 bg-green-50/20' 
                          : 'border-border/60 hover:border-primary/30'
                      }`}
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
                              className="bg-green-600 hover:bg-green-700 text-white gap-2 shadow-lg animate-pulse"
                            >
                              <Play className="h-4 w-4" />
                              🚀 Démarrer Maintenant
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
                                variant={session.status === 'STOPPED' ? 'default' : 'outline'}
                                className={`gap-2 ${
                                  session.status === 'WORKING'
                                    ? 'border-red-200 text-red-600 hover:bg-red-50'
                                    : session.status === 'STOPPED'
                                    ? 'bg-green-600 hover:bg-green-700 text-white shadow-md'
                                    : 'border-green-200 text-green-600 hover:bg-green-50'
                                }`}
                              >
                                {session.status === 'WORKING' ? 
                                  <Square className="h-4 w-4" /> : 
                                  <Play className="h-4 w-4" />
                                }
                                {session.status === 'WORKING' ? 'Arrêter' : '🚀 Démarrer avec WAHA'}
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

      {/* Modal QR Code - Style WAHA Dashboard */}
      <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader className="pb-6">
            <DialogTitle className="flex items-center gap-3 text-xl">
              <div className="p-3 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-xl border border-green-200/30">
                <QrCode className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex flex-col">
                <span>Scanner le QR Code</span>
                <Badge variant="outline" className="w-fit mt-1 bg-orange-50 border-orange-200 text-orange-700">
                  {selectedSession}
                </Badge>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-2">
            {qrCodeData ? (
              <>
                {/* QR Code Display */}
                <div className="text-center">
                  <div className="mx-auto p-6 bg-gradient-to-br from-white to-slate-50 rounded-2xl shadow-lg border-2 border-slate-200 inline-block">
                    <img 
                      src={qrCodeData} 
                      alt="QR Code WhatsApp" 
                      className="w-64 h-64 mx-auto rounded-xl"
                    />
                  </div>
                </div>

                {/* Instructions Style WAHA */}
                <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200">
                  <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    Scan QR Code to authorize this session
                  </h4>
                  <div className="space-y-2 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Open <strong>WhatsApp</strong> on your phone</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Tap <strong>More Options</strong> ⋯ or <strong>Settings</strong> ⚙️</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Tap <strong>Linked Devices</strong> and <strong>Link a device</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Point your phone to this screen to capture <strong>QR Code</strong></span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button 
                    onClick={() => handleConnectWhatsApp(selectedSession)} 
                    variant="outline" 
                    className="flex-1 gap-2 border-slate-300 hover:bg-slate-50"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh QR
                  </Button>
                  
                  <Button
                    onClick={() => {
                      // Télécharger le QR code
                      const link = document.createElement('a');
                      link.href = qrCodeData;
                      link.download = `whatsapp-qr-${selectedSession}.png`;
                      link.click();
                      toast.success('QR Code téléchargé');
                    }}
                    variant="outline"
                    className="gap-2 border-blue-300 text-blue-600 hover:bg-blue-50"
                  >
                    <Download className="h-4 w-4" />
                    Télécharger
                  </Button>
                  
                  <Button
                    onClick={() => {
                      // Partage WhatsApp du QR code
                      const message = `Scannez ce QR Code pour connecter WhatsApp Business à la session ${selectedSession}`;
                      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
                      window.open(whatsappUrl, '_blank');
                      toast.success('Ouverture du partage WhatsApp');
                    }}
                    className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <FaWhatsapp className="h-4 w-4" />
                    Partager
                  </Button>
                </div>

                {/* Auto-refresh indicator */}
                <div className="text-center">
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    QR Code connecté avec WAHA Dashboard
                  </p>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <div className="mx-auto mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-full w-20 h-20 flex items-center justify-center">
                  <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Génération du QR Code...</h3>
                <p className="text-muted-foreground">Connexion à WAHA Dashboard pour générer votre QR Code</p>
              </div>
            )}
          </div>

          {/* Close button */}
          <div className="flex justify-end pt-4 border-t">
            <Button variant="ghost" onClick={() => setShowQRModal(false)} className="gap-2">
              <X className="h-4 w-4" />
              Fermer
            </Button>
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