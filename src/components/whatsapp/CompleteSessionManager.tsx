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
                    {sessions.filter(s => s.status === 'WORKING').length}
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
                    {sessions.filter(s => s.status === 'SCAN_QR_CODE').length}
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
                    {sessions.filter(s => s.status === 'STOPPED').length}
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
                  <p className="text-2xl font-bold text-blue-600">{sessions.length}</p>
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
            ) : sessions.length === 0 ? (
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
            ) : (
              <div className="bg-background/40 rounded-lg border border-border/60">
                {/* En-têtes de colonnes */}
                <div className="grid grid-cols-12 gap-4 p-4 border-b border-border/60 bg-muted/20">
                  <div className="col-span-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Name</span>
                      <div className="flex flex-col">
                        <ChevronDown className="h-3 w-3 rotate-180" />
                        <ChevronDown className="h-3 w-3" />
                      </div>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium">Metadata</span>
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium">Account</span>
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium">Status</span>
                  </div>
                  <div className="col-span-1">
                    <span className="font-medium">Server</span>
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium text-center">Actions</span>
                  </div>
                </div>

                {/* Filtres */}
                <div className="grid grid-cols-12 gap-4 p-4 border-b border-border/40 bg-muted/10">
                  <div className="col-span-3">
                    <Input
                      placeholder="Session"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <div className="text-muted-foreground text-sm h-8 flex items-center">--</div>
                  </div>
                  <div className="col-span-2">
                    <select className="w-full h-8 text-sm rounded-md border border-input bg-background px-2">
                      <option>Account (Phone Number)</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <select className="w-full h-8 text-sm rounded-md border border-input bg-background px-2">
                      <option>Any</option>
                      <option>WORKING</option>
                      <option>STOPPED</option>
                      <option>SCAN_QR_CODE</option>
                      <option>FAILED</option>
                    </select>
                  </div>
                  <div className="col-span-1">
                    <select className="w-full h-8 text-sm rounded-md border border-input bg-background px-2">
                      <option>Any</option>
                      <option>WAHA</option>
                    </select>
                  </div>
                  <div className="col-span-2"></div>
                </div>

                {/* Liste des sessions */}
                <div className="divide-y divide-border/40">
                  {sessions.map((session, index) => (
                    <div key={session.name} className="grid grid-cols-12 gap-4 p-4 hover:bg-muted/10 transition-colors">
                      {/* Checkbox + Name */}
                      <div className="col-span-3 flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-border focus:ring-primary"
                        />
                        <div>
                          <div className="font-medium">{session.name}</div>
                        </div>
                      </div>

                      {/* Metadata */}
                      <div className="col-span-2 flex items-center">
                        <div className="text-muted-foreground text-sm">--</div>
                      </div>

                      {/* Account avec info utilisateur */}
                      <div className="col-span-2 flex items-center">
                        {session.config?.metadata?.phone_number ? (
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                              <Users className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <div className="text-sm font-medium">
                                {session.config.metadata.account || 'UTILISATEUR'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {session.config.metadata.phone_number}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-muted-foreground text-sm">Account (Phone Number)</div>
                        )}
                      </div>

                      {/* Status avec boutons circulaires */}
                      <div className="col-span-2 flex items-center gap-2">
                        {/* Boutons de statut circulaires */}
                        <div className="flex gap-1">
                          {/* Bouton Logout/Disconnect */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDisconnectSession(session.name)}
                            className="h-7 w-7 rounded-full p-0 border-border/40 hover:bg-muted/20"
                            title="Logout"
                          >
                            <ArrowRightLeft className="h-3 w-3" />
                          </Button>

                          {/* Bouton QR Code */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleConnectWhatsApp(session.name)}
                            className={`h-7 w-7 rounded-full p-0 ${
                              session.status === 'SCAN_QR_CODE' 
                                ? 'bg-orange-500/20 border-orange-500/30 text-orange-500 hover:bg-orange-500/30' 
                                : 'border-border/40 hover:bg-muted/20'
                            }`}
                            title="QR Code"
                          >
                            <QrCode className="h-3 w-3" />
                          </Button>

                          {/* Bouton WhatsApp */}
                          <Button
                            variant="outline"
                            size="sm"
                            className={`h-7 w-7 rounded-full p-0 ${
                              session.status === 'WORKING'
                                ? 'bg-green-500/20 border-green-500/30 text-green-500 hover:bg-green-500/30'
                                : 'border-border/40 hover:bg-muted/20'
                            }`}
                            title="WhatsApp"
                          >
                            <MessageSquare className="h-3 w-3" />
                          </Button>

                          {/* Bouton Modules */}
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 w-7 rounded-full p-0 border-border/40 hover:bg-muted/20"
                            title="Modules"
                          >
                            <Grid3X3 className="h-3 w-3" />
                          </Button>
                        </div>

                        {/* Badge de statut */}
                        <Badge 
                          variant="outline" 
                          className={`text-xs font-medium px-2 py-1 ml-2 ${
                            session.status === 'WORKING' ? 'bg-green-500/10 border-green-500/30 text-green-500' :
                            session.status === 'FAILED' ? 'bg-red-500/10 border-red-500/30 text-red-500' :
                            session.status === 'SCAN_QR_CODE' ? 'bg-orange-500/10 border-orange-500/30 text-orange-500' :
                            session.status === 'STOPPED' ? 'bg-slate-500/10 border-slate-500/30 text-slate-500' :
                            'bg-slate-500/10 border-slate-500/30 text-slate-500'
                          }`}
                        >
                          {session.status}
                        </Badge>
                      </div>

                      {/* Server */}
                      <div className="col-span-1 flex items-center">
                        <Badge className="bg-blue-500/10 border-blue-500/30 text-blue-500 text-xs">
                          WAHA
                        </Badge>
                      </div>

                      {/* Actions - Boutons circulaires à droite */}
                      <div className="col-span-2 flex items-center justify-center gap-1">
                        {/* Settings */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(session.name)}
                          className="h-8 w-8 rounded-full p-0 border-border/40 hover:bg-muted/20"
                          title="Settings"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>

                        {/* Dashboard/Analytics */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 rounded-full p-0 bg-blue-500/10 border-blue-500/30 text-blue-500 hover:bg-blue-500/20"
                          title="Dashboard"
                        >
                          <BarChart3 className="h-4 w-4" />
                        </Button>

                        {/* Start/Play */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => session.status === 'STOPPED' ? handleStartSession(session.name) : handleStopSession(session.name)}
                          className={`h-8 w-8 rounded-full p-0 ${
                            session.status === 'WORKING'
                              ? 'bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20'
                              : 'bg-green-500/10 border-green-500/30 text-green-500 hover:bg-green-500/20'
                          }`}
                          title={session.status === 'WORKING' ? 'Stop' : 'Start'}
                        >
                          {session.status === 'WORKING' ? 
                            <Square className="h-4 w-4" /> : 
                            <Play className="h-4 w-4" />
                          }
                        </Button>

                        {/* Restart */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestartSession(session.name)}
                          className="h-8 w-8 rounded-full p-0 bg-orange-500/10 border-orange-500/30 text-orange-500 hover:bg-orange-500/20"
                          title="Restart"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>

                        {/* Stop (carré) */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStopSession(session.name)}
                          className="h-8 w-8 rounded-full p-0 bg-slate-500/10 border-slate-500/30 text-slate-500 hover:bg-slate-500/20"
                          title="Stop Session"
                        >
                          <Square className="h-4 w-4" />
                        </Button>

                        {/* Transfer/Export */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 rounded-full p-0 border-border/40 hover:bg-muted/20"
                          title="Transfer"
                        >
                          <Download className="h-4 w-4" />
                        </Button>

                        {/* Copy */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 rounded-full p-0 border-border/40 hover:bg-muted/20"
                          title="Copy"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>

                        {/* Delete */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteSession(session.name)}
                          className="h-8 w-8 rounded-full p-0 bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer avec pagination et stats */}
                <div className="p-4 border-t border-border/40 bg-muted/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className={`h-2 w-2 rounded-full ${autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`} />
                        Auto-refresh: {autoRefresh ? 'Activé' : 'Désactivé'}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setAutoRefresh(!autoRefresh)}
                          className="h-6 px-2 text-xs"
                        >
                          {autoRefresh ? 'Désactiver' : 'Activer'}
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">
                        Total: {sessions.length} sessions
                      </span>
                      
                      {/* Pagination */}
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                          ‹‹
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                          ‹
                        </Button>
                        <span className="text-sm px-2">1</span>
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                          ›
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                          ››
                        </Button>
                        
                        <select className="h-8 text-sm rounded border border-input bg-background px-2 ml-2">
                          <option>10</option>
                          <option>25</option>
                          <option>50</option>
                        </select>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={refreshData}
                        disabled={loading}
                        className="h-8 px-3 text-xs gap-2"
                      >
                        <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                        Actualiser
                      </Button>
                    </div>
                  </div>
                </div>
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