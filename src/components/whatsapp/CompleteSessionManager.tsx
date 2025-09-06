import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
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
  ArrowRightLeft
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
  const [newSessionName, setNewSessionName] = useState('');
  const [selectedSession, setSelectedSession] = useState<string>('');
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

  // Auto-refresh des sessions et détection de nouvelles sessions
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      refreshData();
    }, 5000); // Refresh toutes les 5 secondes pour une détection plus rapide

    return () => clearInterval(interval);
  }, [autoRefresh, refreshData]);

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

    try {
      await createSession(newSessionName);
      setCreatedSession(newSessionName);
      setNewSessionName('');
      setShowCreateModal(false);
      
      // Rafraîchir immédiatement plusieurs fois pour s'assurer que la session apparaît
      const refreshAttempts = [500, 1500, 3000];
      refreshAttempts.forEach(delay => {
        setTimeout(() => refreshData(), delay);
      });
      
      toast.success(`Session "${newSessionName}" créée - Affichage automatique en cours...`);
    } catch (error) {
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Tabs defaultValue="sessions" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-slate-800 border-slate-700">
          <TabsTrigger value="sessions" className="data-[state=active]:bg-slate-700 text-white">
            Sessions WhatsApp
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-slate-700 text-white">
            Analytics
          </TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-slate-700 text-white">
            Configuration
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="space-y-6">
          {/* Interface WAHA Dashboard Style - Reproduction exacte */}
          <div className="bg-slate-900 rounded-lg border border-slate-800">
            {/* Header avec bouton Start New et Search */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2"
              >
                <Play className="h-4 w-4" />
                Start New
              </Button>
              
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Input
                    placeholder="Search by Name, Phone"
                    className="w-64 bg-slate-800 border-slate-700 text-white placeholder:text-slate-400"
                  />
                </div>
                <Button variant="outline" className="border-slate-700 text-slate-300 bg-slate-800 hover:bg-slate-700">
                  Columns
                </Button>
              </div>
            </div>

            {/* Headers du tableau */}
            <div className="grid grid-cols-12 gap-4 p-4 border-b border-slate-800 bg-slate-800/50">
              <div className="col-span-3">
                <div className="flex items-center gap-2 text-slate-300 font-medium">
                  Name
                  <div className="flex flex-col text-xs">
                    <span>↑</span>
                    <span>↓</span>
                  </div>
                </div>
              </div>
              <div className="col-span-2">
                <span className="text-slate-300 font-medium">Metadata</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-300 font-medium">Account</span>
              </div>
              <div className="col-span-1">
                <span className="text-slate-300 font-medium">Status</span>
              </div>
              <div className="col-span-1">
                <span className="text-slate-300 font-medium">Server</span>
              </div>
              <div className="col-span-3">
                <span className="text-slate-300 font-medium text-center">Actions</span>
              </div>
            </div>

            {/* Filtres */}
            <div className="grid grid-cols-12 gap-4 p-4 border-b border-slate-800 bg-slate-800/30">
              <div className="col-span-3">
                <Input
                  placeholder="Session"
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 text-sm h-8"
                />
              </div>
              <div className="col-span-2">
                <div className="text-slate-500 text-sm h-8 flex items-center">--</div>
              </div>
              <div className="col-span-2">
                <select className="w-full bg-slate-800 border border-slate-700 text-white text-sm h-8 rounded px-2">
                  <option>Account (Phone Number)</option>
                </select>
              </div>
              <div className="col-span-1">
                <select className="w-full bg-slate-800 border border-slate-700 text-white text-sm h-8 rounded px-2">
                  <option>Any</option>
                </select>
              </div>
              <div className="col-span-1">
                <select className="w-full bg-slate-800 border border-slate-700 text-white text-sm h-8 rounded px-2">
                  <option>Any</option>
                </select>
              </div>
              <div className="col-span-3"></div>
            </div>

            {/* Sessions List */}
            <div className="divide-y divide-slate-800">
              {sessions.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  Aucune session disponible. Créez votre première session WhatsApp.
                </div>
              ) : (
                sessions.map((session) => (
                  <div key={session.name} className="grid grid-cols-12 gap-4 p-4 hover:bg-slate-800/30 transition-colors">
                    {/* Checkbox + Name */}
                    <div className="col-span-3 flex items-center gap-3">
                      <input type="checkbox" className="w-4 h-4 text-green-600 bg-slate-800 border-slate-600 rounded focus:ring-green-500" />
                      <div>
                        <div className="text-white font-medium">{session.name}</div>
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="col-span-2 flex items-center">
                      <div className="text-slate-400 text-sm">--</div>
                    </div>

                    {/* Account */}
                    <div className="col-span-2 flex items-center">
                      {session.config?.metadata?.phone_number ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
                            <Users className="h-3 w-3 text-white" />
                          </div>
                          <div>
                            <div className="text-green-400 text-sm font-medium">
                              {session.config.metadata.account || 'WhatsApp User'}
                            </div>
                            <div className="text-slate-400 text-xs">
                              {session.config.metadata.phone_number}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-slate-500 text-sm">Account (Phone Number)</div>
                      )}
                    </div>

                    {/* Status avec les 4 boutons circulaires de statut */}
                    <div className="col-span-1 flex items-center gap-2">
                      <div className="flex gap-1">
                        {/* Bouton Logout/Disconnect */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDisconnectSession(session.name)}
                          className="h-7 w-7 rounded-full bg-slate-700 border-slate-600 text-slate-400 hover:bg-slate-600 p-0"
                          title="Logout"
                        >
                          <ArrowRightLeft className="h-3 w-3" />
                        </Button>

                        {/* Bouton QR Code/Camera */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleConnectWhatsApp(session.name)}
                          className={`h-7 w-7 rounded-full p-0 ${
                            session.status === 'SCAN_QR_CODE' 
                              ? 'bg-orange-500/20 border-orange-500/30 text-orange-400 hover:bg-orange-500/30' 
                              : 'bg-slate-700 border-slate-600 text-slate-400 hover:bg-slate-600'
                          }`}
                          title="QR Code"
                        >
                          <QrCode className="h-3 w-3" />
                        </Button>

                        {/* Bouton WhatsApp */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 w-7 rounded-full bg-green-600/20 border-green-600/30 text-green-400 hover:bg-green-600/30 p-0"
                          title="WhatsApp"
                        >
                          <MessageSquare className="h-3 w-3" />
                        </Button>

                        {/* Bouton Modules/Code */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 w-7 rounded-full bg-slate-700 border-slate-600 text-slate-400 hover:bg-slate-600 p-0"
                          title="Modules"
                        >
                          <Grid3X3 className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* Badge de statut */}
                      <Badge 
                        variant="outline" 
                        className={`text-xs font-medium px-2 py-1 ${
                          session.status === 'WORKING' ? 'bg-green-500/20 border-green-500/30 text-green-400' :
                          session.status === 'FAILED' ? 'bg-red-500/20 border-red-500/30 text-red-400' :
                          session.status === 'SCAN_QR_CODE' ? 'bg-orange-500/20 border-orange-500/30 text-orange-400' :
                          session.status === 'STOPPED' ? 'bg-slate-500/20 border-slate-500/30 text-slate-400' :
                          'bg-slate-500/20 border-slate-500/30 text-slate-400'
                        }`}
                      >
                        {session.status}
                      </Badge>
                    </div>

                    {/* Server */}
                    <div className="col-span-1 flex items-center">
                      <Badge className="bg-blue-500/20 border-blue-500/30 text-blue-400 text-xs">
                        WAHA
                      </Badge>
                    </div>

                    {/* Actions - Boutons circulaires à droite */}
                    <div className="col-span-3 flex items-center justify-center gap-1">
                      {/* Settings */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(session.name)}
                        className="h-8 w-8 rounded-full bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600 p-0"
                        title="Paramètres"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>

                      {/* Dashboard/Stats */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 rounded-full bg-blue-500/20 border-blue-500/30 text-blue-400 hover:bg-blue-500/30 p-0"
                        title="Dashboard"
                      >
                        <Activity className="h-4 w-4" />
                      </Button>

                      {/* Start/Play */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStartSession(session.name)}
                        disabled={session.status === 'WORKING'}
                        className="h-8 w-8 rounded-full bg-green-500/20 border-green-500/30 text-green-400 hover:bg-green-500/30 p-0 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Démarrer"
                      >
                        <Play className="h-4 w-4" />
                      </Button>

                      {/* Restart */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestartSession(session.name)}
                        className="h-8 w-8 rounded-full bg-blue-500/20 border-blue-500/30 text-blue-400 hover:bg-blue-500/30 p-0"
                        title="Redémarrer"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>

                      {/* Stop */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStopSession(session.name)}
                        disabled={session.status === 'STOPPED'}
                        className="h-8 w-8 rounded-full bg-slate-500/20 border-slate-500/30 text-slate-400 hover:bg-slate-500/30 p-0 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Arrêter"
                      >
                        <Square className="h-4 w-4" />
                      </Button>

                      {/* Transfer */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 rounded-full bg-orange-500/20 border-orange-500/30 text-orange-400 hover:bg-orange-500/30 p-0"
                        title="Transférer"
                      >
                        <ArrowRightLeft className="h-4 w-4" />
                      </Button>

                      {/* Delete */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteSession(session.name)}
                        className="h-8 w-8 rounded-full bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30 p-0"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer avec statistiques */}
            <div className="p-4 border-t border-slate-800 bg-slate-800/30">
              <div className="flex items-center justify-between text-sm text-slate-400">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${autoRefresh ? 'bg-green-400' : 'bg-slate-400'}`} />
                    <span>Auto-refresh: {autoRefresh ? 'Activé' : 'Désactivé'}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setAutoRefresh(!autoRefresh)}
                      className="h-6 px-2 text-xs hover:bg-slate-700"
                    >
                      {autoRefresh ? 'Désactiver' : 'Activer'}
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span>Total: {sessions.length} sessions</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={refreshData}
                    disabled={loading}
                    className="h-6 px-2 text-xs hover:bg-slate-700"
                  >
                    <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
                    Actualiser
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card className="border-slate-700 bg-slate-900/50">
            <CardHeader>
              <CardTitle className="text-white">Analytics des Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400">Fonctionnalité en développement...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card className="border-slate-700 bg-slate-900/50">
            <CardHeader>
              <CardTitle className="text-white">Configuration WAHA</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400">Paramètres de connexion WAHA...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal QR Code */}
      <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
        <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <QrCode className="h-5 w-5 text-blue-400" />
              Connexion WhatsApp - {selectedSession}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {qrCodeData ? (
              <div className="text-center">
                <div className="bg-white p-4 rounded-lg inline-block mb-4">
                  <img src={qrCodeData} alt="QR Code WhatsApp" className="w-48 h-48 mx-auto" />
                </div>
                <p className="text-slate-300 text-sm">
                  Scannez ce QR code avec WhatsApp pour vous connecter
                </p>
              </div>
            ) : (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-400 mb-4" />
                <p className="text-slate-400">Génération du QR code...</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Création Session */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Plus className="h-5 w-5 text-green-400" />
              Nouvelle Session WhatsApp
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Input
                placeholder="Nom de la session"
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleCreateSession}
                disabled={!newSessionName.trim()}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Créer
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowCreateModal(false)}
                className="border-slate-600 text-slate-300"
              >
                Annuler
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Détails Session */}
      <Dialog open={showSessionDetails} onOpenChange={setShowSessionDetails}>
        <DialogContent className="sm:max-w-2xl bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Settings className="h-5 w-5 text-blue-400" />
              Détails Session - {selectedSession}
            </DialogTitle>
          </DialogHeader>
          {sessionDetails && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-400">Statut</label>
                  <p className="text-white">{sessionDetails.status}</p>
                </div>
                <div>
                  <label className="text-sm text-slate-400">Téléphone</label>
                  <p className="text-white">{sessionDetails.phoneNumber || 'Non connecté'}</p>
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