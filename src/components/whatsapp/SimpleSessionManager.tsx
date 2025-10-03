import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import QRConnectionFlow from '@/components/whatsapp/QRConnectionFlow';
import BotWebhookLinker from './BotWebhookLinker';
import WebhookConfigModal from './WebhookConfigModal';
import { 
  Play, 
  Square, 
  RotateCcw, 
  Trash2, 
  QrCode,
  Plus,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  MessageSquare,
  Activity,
  Loader2,
  Search,
  ChevronDown,
  BarChart3,
  Link2,
  Webhook
} from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { useWAHADashboard, WAHASession } from '@/hooks/useWAHADashboard';

const SimpleSessionManager: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [newSessionName, setNewSessionName] = useState('');
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [userSessions, setUserSessions] = useState<string[]>([]);
  const [userSessionsFromDB, setUserSessionsFromDB] = useState<any[]>([]);
  const [showBotLinker, setShowBotLinker] = useState(false);
  const [selectedSessionForBot, setSelectedSessionForBot] = useState('');
  const [showWebhookConfig, setShowWebhookConfig] = useState(false);
  const [selectedSessionForWebhook, setSelectedSessionForWebhook] = useState('');

  const { 
    sessions, 
    createSession, 
    startSession, 
    stopSession, 
    deleteSession,
    getQRCode,
    sendTestMessage,
    refreshData,
    loading,
    error 
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

      await loadUserSessions();
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  // Créer les sessions à afficher
  const getUserFilteredSessions = () => {
    if (!user?.id) return [];
    
    const hybridSessions: WAHASession[] = [];

    // Sessions depuis Supabase
    userSessionsFromDB.forEach(dbSession => {
      const wahaSession = sessions.find(s => s.name === dbSession.session_name);
      
      if (wahaSession) {
        hybridSessions.push(wahaSession);
      } else {
        hybridSessions.push({
          name: dbSession.session_name,
          status: 'STOPPED',
          config: {},
          server: 'WAHA'
        });
      }
    });

    return hybridSessions;
  };

  const filteredSessions = getUserFilteredSessions().filter(session =>
    session.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Gestionnaires d'événements avec fermeture automatique des modales
  const handleCreateSession = async () => {
    if (!newSessionName.trim()) {
      toast.error('Veuillez entrer un nom de session');
      return;
    }

    try {
      await createSession(newSessionName);
      await saveUserSession(newSessionName);
      setNewSessionName('');
      setShowCreateModal(false);
      toast.success(`Session "${newSessionName}" créée avec succès!`);
    } catch (error) {
      console.error('Erreur lors de la création:', error);
      toast.error('Erreur lors de la création de la session');
    }
  };

  const handleStartSession = async (sessionName: string) => {
    try {
      await startSession(sessionName);
      toast.success(`Session "${sessionName}" démarrée!`);
    } catch (error) {
      console.error('Erreur lors du démarrage:', error);
      toast.error('Erreur lors du démarrage de la session');
    }
  };

  const handleStopSession = async (sessionName: string) => {
    try {
      await stopSession(sessionName);
      toast.success(`Session "${sessionName}" arrêtée!`);
    } catch (error) {
      console.error('Erreur lors de l\'arrêt:', error);
      toast.error('Erreur lors de l\'arrêt de la session');
    }
  };

  const handleDeleteSession = async (sessionName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer la session "${sessionName}" ?`)) {
      return;
    }

    try {
      await deleteSession(sessionName);
      await removeUserSession(sessionName);
      toast.success(`Session "${sessionName}" supprimée!`);
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression de la session');
    }
  };

  const handleScanQR = async (sessionName: string) => {
    setSelectedSession(sessionName);
    setShowQRModal(true);
  };

  const handleRestartSession = async (sessionName: string) => {
    try {
      await stopSession(sessionName);
      await new Promise(resolve => setTimeout(resolve, 1000));
      await startSession(sessionName);
      toast.success(`Session "${sessionName}" redémarrée!`);
    } catch (error) {
      console.error('Erreur lors du redémarrage:', error);
      toast.error('Erreur lors du redémarrage de la session');
    }
  };

  const handleSendTestMessage = async (sessionName: string) => {
    try {
      const testNumber = "+237600000000";
      const testMessage = "Message de test depuis Bot.bj ✨";
      
      await sendTestMessage(sessionName, testNumber, testMessage);
      toast.success('Message de test envoyé!');
    } catch (error) {
      console.error('Erreur lors de l\'envoi du test:', error);
      toast.error('Erreur lors de l\'envoi du message de test');
    }
  };

  // Calcul des statistiques
  const getSessionStats = () => {
    const total = filteredSessions.length;
    const active = filteredSessions.filter(s => s.status === 'WORKING').length;
    const pending = filteredSessions.filter(s => s.status === 'SCAN_QR_CODE').length;
    const stopped = filteredSessions.filter(s => s.status === 'STOPPED').length;

    return { total, active, pending, stopped };
  };

  const stats = getSessionStats();

  // Effets
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      loadUserSessions();
    }
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    const interval = setInterval(() => {
      refreshData();
    }, 30000);

    return () => clearInterval(interval);
  }, [refreshData]);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* En-tête avec statistiques - Responsive */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 md:px-6 pt-3 md:pt-6">
            <CardTitle className="text-xs md:text-sm font-medium">Total Sessions</CardTitle>
            <BarChart3 className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
            <div className="text-lg md:text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 md:px-6 pt-3 md:pt-6">
            <CardTitle className="text-xs md:text-sm font-medium">Sessions Actives</CardTitle>
            <CheckCircle2 className="h-3 w-3 md:h-4 md:w-4 text-green-600" />
          </CardHeader>
          <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
            <div className="text-lg md:text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 md:px-6 pt-3 md:pt-6">
            <CardTitle className="text-xs md:text-sm font-medium">En Attente QR</CardTitle>
            <Clock className="h-3 w-3 md:h-4 md:w-4 text-orange-600" />
          </CardHeader>
          <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
            <div className="text-lg md:text-2xl font-bold text-orange-600">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 md:px-6 pt-3 md:pt-6">
            <CardTitle className="text-xs md:text-sm font-medium">Sessions Arrêtées</CardTitle>
            <AlertCircle className="h-3 w-3 md:h-4 md:w-4 text-gray-600" />
          </CardHeader>
          <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
            <div className="text-lg md:text-2xl font-bold text-gray-600">{stats.stopped}</div>
          </CardContent>
        </Card>
      </div>

      {/* Actions principales - Responsive */}
      <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-between items-stretch sm:items-center">
        <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
          <Button 
            onClick={() => setShowCreateModal(true)}
            className="gap-2 w-full sm:w-auto text-sm md:text-base"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Créer une session</span>
            <span className="sm:hidden">Créer</span>
          </Button>
          
          <Button 
            variant="outline" 
            onClick={refreshData}
            disabled={loading}
            className="gap-2 w-full sm:w-auto text-sm md:text-base"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualiser</span>
            <span className="sm:hidden">Maj</span>
          </Button>
        </div>

        <div className="relative w-full sm:w-auto sm:min-w-[200px] md:min-w-[240px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full text-sm md:text-base"
          />
        </div>
      </div>

      {/* Liste des sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <FaWhatsapp className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
            Sessions WhatsApp ({filteredSessions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-sm md:text-base">Chargement des sessions...</span>
            </div>
          )}

          {!loading && filteredSessions.length === 0 && (
            <div className="text-center py-8">
              <div className="text-muted-foreground text-sm md:text-base">
                {searchTerm ? `Aucune session trouvée pour "${searchTerm}"` : 'Aucune session disponible'}
              </div>
              {!searchTerm && (
                <Button 
                  onClick={() => setShowCreateModal(true)}
                  className="mt-4"
                  variant="outline"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Créer votre première session
                </Button>
              )}
            </div>
          )}

          {!loading && filteredSessions.length > 0 && (
            <div className="space-y-3 md:space-y-4">
              {filteredSessions.map((session) => (
                <div 
                  key={session.name}
                  className="border border-border rounded-lg overflow-hidden hover:shadow-md transition-all duration-200 animate-fade-in"
                >
                  <div 
                    className="p-3 md:p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setExpandedSession(expandedSession === session.name ? null : session.name)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 md:space-x-4 flex-1 min-w-0">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <FaWhatsapp className="h-5 w-5 md:h-6 md:w-6 text-green-600 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-sm md:text-lg truncate">{session.name}</h3>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Badge 
                                className={`text-xs ${
                                  session.status === 'WORKING' ? 'bg-green-500/10 border-green-500/30 text-green-600' :
                                  session.status === 'SCAN_QR_CODE' ? 'bg-orange-500/10 border-orange-500/30 text-orange-600' :
                                  session.status === 'STOPPED' ? 'bg-slate-500/10 border-slate-500/30 text-slate-600' :
                                  'bg-red-500/10 border-red-500/30 text-red-600'
                                }`}
                              >
                                {session.status}
                              </Badge>
                              {session.config?.metadata?.phone_number && (
                                <span className="text-xs md:text-sm text-muted-foreground truncate max-w-[120px] md:max-w-none">
                                  {session.config.metadata.phone_number}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                        {/* Actions rapides */}
                        {session.status === 'WORKING' ? (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStopSession(session.name);
                            }}
                            size="sm"
                            variant="outline"
                            className="gap-1 md:gap-2 border-red-200 text-red-600 hover:bg-red-50 text-xs md:text-sm"
                          >
                            <Square className="h-3 w-3 md:h-4 md:w-4" />
                            <span className="hidden md:inline">Arrêter</span>
                          </Button>
                        ) : session.status === 'SCAN_QR_CODE' ? (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleScanQR(session.name);
                            }}
                            size="sm"
                            variant="outline"
                            className="gap-1 md:gap-2 border-orange-200 text-orange-600 hover:bg-orange-50 text-xs md:text-sm"
                          >
                            <QrCode className="h-3 w-3 md:h-4 md:w-4" />
                            <span className="hidden md:inline">Scanner QR</span>
                          </Button>
                        ) : (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartSession(session.name);
                            }}
                            size="sm"
                            className="gap-1 md:gap-2 text-xs md:text-sm"
                          >
                            <Play className="h-3 w-3 md:h-4 md:w-4" />
                            <span className="hidden md:inline">Démarrer</span>
                          </Button>
                        )}

                        <ChevronDown className={`h-4 w-4 md:h-5 md:w-5 text-muted-foreground transition-transform duration-200 ${
                          expandedSession === session.name ? 'rotate-180' : ''
                        }`} />
                      </div>
                    </div>
                  </div>

                  {/* Panel d'actions détaillées - Responsive */}
                  {expandedSession === session.name && (
                    <div className="border-t border-border/40 bg-muted/5 animate-accordion-down">
                      <div className="p-3 md:p-6 space-y-3 md:space-y-4">
                        {/* Actions de session */}
                        <div className="space-y-3 md:space-y-4">
                          <h4 className="text-sm font-semibold">Actions disponibles</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
                            <Button
                              onClick={() => session.status === 'STOPPED' ? handleStartSession(session.name) : handleStopSession(session.name)}
                              variant={session.status === 'STOPPED' ? 'default' : 'outline'}
                              className="gap-2 text-sm"
                              size="sm"
                            >
                              {session.status === 'WORKING' ? 
                                <Square className="h-4 w-4" /> : 
                                <Play className="h-4 w-4" />
                              }
                              {session.status === 'WORKING' ? 'Arrêter' : 'Démarrer'}
                            </Button>

                            <Button
                              onClick={() => handleScanQR(session.name)}
                              variant="outline"
                              className="gap-2 text-sm"
                              size="sm"
                            >
                              <QrCode className="h-4 w-4" />
                              Scanner QR
                            </Button>

                            <Button
                              onClick={() => handleRestartSession(session.name)}
                              variant="outline"
                              className="gap-2 text-sm"
                              size="sm"
                            >
                              <RotateCcw className="h-4 w-4" />
                              Redémarrer
                            </Button>

                            <Button
                              onClick={() => handleDeleteSession(session.name)}
                              variant="outline"
                              className="gap-2 border-red-200 text-red-600 hover:bg-red-50 text-sm"
                              size="sm"
                            >
                              <Trash2 className="h-4 w-4" />
                              Supprimer
                            </Button>
                          </div>
                        </div>

                        {/* Configuration et intégrations */}
                        <div className="space-y-3 md:space-y-4">
                          <h4 className="text-sm font-semibold">Configuration & Intégrations</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
                            <Button
                              onClick={() => {
                                setSelectedSessionForWebhook(session.name);
                                setShowWebhookConfig(true);
                              }}
                              variant="outline"
                              className="gap-2 w-full text-sm"
                              size="sm"
                            >
                              <Webhook className="h-4 w-4" />
                              Config Webhook
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modales */}
      
      {/* Modal de création de session - Responsive */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="w-[95vw] max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="text-base md:text-lg">Créer une nouvelle session</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nom de la session</label>
              <Input
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
                placeholder="Ex: MonWhatsApp"
                className="mt-2"
                onKeyPress={(e) => e.key === 'Enter' && handleCreateSession()}
              />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 pt-4">
              <Button onClick={handleCreateSession} className="flex-1">
                Créer la session
              </Button>
              <Button variant="outline" onClick={() => setShowCreateModal(false)} className="flex-1">
                Annuler
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal QR - Responsive avec fermeture automatique */}
      <QRConnectionFlow
        open={showQRModal}
        onOpenChange={(open) => {
          setShowQRModal(open);
          if (!open) {
            // Fermeture automatique après scan réussi
            setTimeout(() => refreshData(), 2000);
          }
        }}
        sessionName={selectedSession}
      />

      {/* Modal Bot Linker - Responsive avec fermeture automatique */}
      {showBotLinker && (
        <BotWebhookLinker
          open={showBotLinker}
          onOpenChange={(open) => {
            setShowBotLinker(open);
            if (!open) {
              // Fermeture automatique après configuration
              setTimeout(() => refreshData(), 1000);
            }
          }}
          sessionName={selectedSessionForBot}
        />
      )}

      {/* Modal Webhook Config - Responsive avec fermeture automatique */}
      <WebhookConfigModal
        open={showWebhookConfig}
        onOpenChange={(open) => {
          setShowWebhookConfig(open);
          if (!open) {
            // Fermeture automatique après configuration
            setTimeout(() => refreshData(), 1000);
          }
        }}
        sessionName={selectedSessionForWebhook}
      />
    </div>
  );
};

export default SimpleSessionManager;