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
import WhatsAppQRModal from '@/components/whatsapp/WhatsAppQRModal';
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
  BarChart3
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

  // Gestionnaires d'événements
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
      // Utilisation de valeurs par défaut pour le test
      const testNumber = "+237600000000"; // Numéro de test par défaut
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
    <div className="space-y-6">
      {/* En-tête avec statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sessions Actives</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Attente QR</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sessions Arrêtées</CardTitle>
            <AlertCircle className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.stopped}</div>
          </CardContent>
        </Card>
      </div>

      {/* Actions principales */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
        <div className="flex gap-2">
          <Button 
            onClick={() => setShowCreateModal(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Créer une session
          </Button>
          
          <Button 
            variant="outline" 
            onClick={refreshData}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>

        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Rechercher une session..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full sm:w-64"
          />
        </div>
      </div>

      {/* Liste des sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FaWhatsapp className="h-5 w-5 text-green-600" />
            Sessions WhatsApp ({filteredSessions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Chargement des sessions...</span>
            </div>
          )}

          {!loading && filteredSessions.length === 0 && (
            <div className="text-center py-8">
              <div className="text-muted-foreground">
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
            <div className="space-y-4">
              {filteredSessions.map((session) => (
                <div 
                  key={session.name}
                  className="border border-border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div 
                    className="p-4 cursor-pointer hover:bg-muted/50"
                    onClick={() => setExpandedSession(expandedSession === session.name ? null : session.name)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-3">
                          <FaWhatsapp className="h-6 w-6 text-green-600" />
                          <div>
                            <h3 className="font-semibold text-lg">{session.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
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
                                <span className="text-sm text-muted-foreground">
                                  {session.config.metadata.phone_number}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Actions rapides */}
                        {session.status === 'WORKING' ? (
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
                        ) : session.status === 'SCAN_QR_CODE' ? (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleScanQR(session.name);
                            }}
                            size="sm"
                            variant="outline"
                            className="gap-2 border-orange-200 text-orange-600 hover:bg-orange-50"
                          >
                            <QrCode className="h-4 w-4" />
                            Scanner QR
                          </Button>
                        ) : (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartSession(session.name);
                            }}
                            size="sm"
                            className="gap-2"
                          >
                            <Play className="h-4 w-4" />
                            Démarrer
                          </Button>
                        )}

                        <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${
                          expandedSession === session.name ? 'rotate-180' : ''
                        }`} />
                      </div>
                    </div>
                  </div>

                  {/* Panel d'actions détaillées */}
                  {expandedSession === session.name && (
                    <div className="border-t border-border/40 bg-muted/5">
                      <div className="p-6 space-y-4">
                        {/* Actions de session */}
                        <div className="space-y-4">
                          <h4 className="text-sm font-semibold">Actions disponibles</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <Button
                              onClick={() => session.status === 'STOPPED' ? handleStartSession(session.name) : handleStopSession(session.name)}
                              variant={session.status === 'STOPPED' ? 'default' : 'outline'}
                              className="gap-2"
                            >
                              {session.status === 'WORKING' ? 
                                <Square className="h-4 w-4" /> : 
                                <Play className="h-4 w-4" />
                              }
                              {session.status === 'WORKING' ? 'Arrêter' : 'Démarrer'}
                            </Button>

                            <Button
                              onClick={() => handleRestartSession(session.name)}
                              variant="outline"
                              className="gap-2"
                            >
                              <RotateCcw className="h-4 w-4" />
                              Redémarrer
                            </Button>

                            <Button
                              onClick={() => handleScanQR(session.name)}
                              variant="outline"
                              className="gap-2 border-orange-200 text-orange-600 hover:bg-orange-50"
                            >
                              <QrCode className="h-4 w-4" />
                              Scanner QR
                            </Button>

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

                        {/* Test de messages (si connecté) */}
                        {session.status === 'WORKING' && (
                          <>
                            <Separator />
                            <div className="space-y-4">
                              <h4 className="text-sm font-semibold">Test de messages</h4>
                              <Button
                                onClick={() => handleSendTestMessage(session.name)}
                                variant="outline"
                                className="gap-2 border-green-200 text-green-600 hover:bg-green-50"
                              >
                                <MessageSquare className="h-4 w-4" />
                                Envoyer un message de test
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de création de session */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Créer une nouvelle session WhatsApp
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nom de la session</label>
              <Input
                placeholder="Ex: session_principale"
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateSession()}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Annuler
              </Button>
              <Button onClick={handleCreateSession} disabled={!newSessionName.trim()}>
                Créer la session
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal QR Code */}
      <WhatsAppQRModal
        open={showQRModal}
        onOpenChange={setShowQRModal}
        sessionName={selectedSession}
        onQRScanned={() => {
          setShowQRModal(false);
          refreshData();
          toast.success('WhatsApp connecté avec succès!');
        }}
      />
    </div>
  );
};

export default SimpleSessionManager;