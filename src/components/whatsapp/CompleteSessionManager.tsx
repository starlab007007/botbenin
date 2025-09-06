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

  // Auto-refresh des sessions
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      refreshData();
    }, 10000); // Refresh toutes les 10 secondes

    return () => clearInterval(interval);
  }, [autoRefresh, refreshData]);

  // Simuler le processus de connexion avec étapes
  const startConnectionProcess = (sessionName: string) => {
    setIsConnecting(true);
    setConnectionProgress(0);
    setSessionSteps([
      { id: '1', name: 'Initialisation', status: 'active', description: 'Préparation de la session' },
      { id: '2', name: 'Démarrage', status: 'pending', description: 'Démarrage du service WhatsApp' },
      { id: '3', name: 'QR Code', status: 'pending', description: 'Génération du QR code' },
      { id: '4', name: 'Scan', status: 'pending', description: 'En attente du scan WhatsApp' },
      { id: '5', name: 'Connexion', status: 'pending', description: 'Établissement de la connexion' },
      { id: '6', name: 'Prêt', status: 'pending', description: 'Session active et prête' }
    ]);

    // Simuler les étapes de connexion
    const steps = [
      { step: 1, delay: 1000, progress: 20 },
      { step: 2, delay: 2000, progress: 40 },
      { step: 3, delay: 1500, progress: 60 },
      { step: 4, delay: 0, progress: 80 }, // Cette étape attend le scan
      { step: 5, delay: 2000, progress: 95 },
      { step: 6, delay: 1000, progress: 100 }
    ];

    let currentStep = 0;
    
    const processStep = () => {
      if (currentStep < steps.length) {
        const { step, delay, progress } = steps[currentStep];
        
        setTimeout(async () => {
          setConnectionProgress(progress);
          
          // Mettre à jour le statut des étapes
          setSessionSteps(prev => prev.map((s, index) => ({
            ...s,
            status: index < step ? 'completed' : index === step ? 'active' : 'pending'
          })));

          // Actions spécifiques par étape
          switch (step) {
            case 2:
              await handleStartSession(sessionName);
              break;
            case 3:
              await handleGetQR(sessionName);
              break;
            case 4:
              // Cette étape attend le scan utilisateur
              return; // Ne pas continuer automatiquement
            case 5:
              // Vérifier la connexion
              break;
            case 6:
              setIsConnecting(false);
              toast.success('Session connectée avec succès !');
              setShowQRModal(false);
              return;
          }

          currentStep++;
          if (currentStep < steps.length && step !== 4) {
            processStep();
          }
        }, delay);
      }
    };

    processStep();
  };

  // Simuler la détection du scan QR
  const handleQRScanned = () => {
    setSessionSteps(prev => prev.map((s, index) => ({
      ...s,
      status: index <= 3 ? 'completed' : index === 4 ? 'active' : 'pending'
    })));
    
    setConnectionProgress(95);
    
    setTimeout(() => {
      setSessionSteps(prev => prev.map(s => ({ ...s, status: 'completed' })));
      setConnectionProgress(100);
      setIsConnecting(false);
      toast.success('Connexion WhatsApp établie !');
      setShowQRModal(false);
    }, 2000);
  };

  const handleCreateSession = async () => {
    if (!newSessionName.trim()) {
      toast.error('Veuillez entrer un nom de session');
      return;
    }

    try {
      await createSession(newSessionName);
      setNewSessionName('');
      setShowCreateModal(false);
      setCreatedSession(newSessionName);
      toast.success('Session créée avec succès');
    } catch (error) {
      toast.error('Erreur lors de la création de la session');
    }
  };

  // Component pour les actions immédiates de session
  const SessionImmediateActions: React.FC<{ sessionName: string; onClose: () => void }> = ({ sessionName, onClose }) => {
    const session = sessions.find(s => s.name === sessionName);
    
    const actionButtons = [
      {
        icon: Settings,
        label: 'Paramètres',
        color: 'from-gray-600 to-gray-700',
        action: () => handleViewDetails(sessionName)
      },
      {
        icon: Grid3X3,
        label: 'Modules',
        color: 'from-blue-600 to-blue-700',
        action: () => toast.info('Modules à venir')
      },
      {
        icon: Play,
        label: 'Démarrer',
        color: 'from-green-600 to-green-700',
        action: () => handleStartSession(sessionName)
      },
      {
        icon: RotateCcw,
        label: 'Redémarrer',
        color: 'from-orange-600 to-orange-700',
        action: () => handleRestartSession(sessionName)
      },
      {
        icon: Square,
        label: 'Arrêter',
        color: 'from-red-600 to-red-700',
        action: () => handleDisconnectSession(sessionName)
      },
      {
        icon: ArrowRightLeft,
        label: 'Transférer',
        color: 'from-purple-600 to-purple-700',
        action: () => toast.info('Transfert à venir')
      },
      {
        icon: Trash2,
        label: 'Supprimer',
        color: 'from-red-600 to-red-800',
        action: () => handleDeleteSession(sessionName)
      }
    ];

    return (
      <Card className="border-2 border-primary/20 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`h-3 w-3 rounded-full ${getStatusColor(session?.status || '')}`} />
              <CardTitle className="text-xl">{sessionName}</CardTitle>
              <Badge variant="outline" className="flex items-center gap-1">
                {getStatusIcon(session?.status || '')}
                {session?.status || 'Inconnue'}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-center text-sm text-muted-foreground">
              Actions immédiates pour votre session
            </div>
            
            <div className="flex justify-center items-center gap-2 flex-wrap">
              {actionButtons.map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={action.action}
                  className={`
                    relative overflow-hidden h-16 w-16 rounded-full border-2 
                    bg-gradient-to-br ${action.color} text-white border-white/20
                    hover:scale-105 transition-all duration-200 shadow-lg
                    hover:shadow-xl group
                  `}
                  title={action.label}
                >
                  <action.icon className="h-6 w-6" />
                  <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 
                                text-xs font-medium opacity-0 group-hover:opacity-100 
                                transition-opacity duration-200 whitespace-nowrap
                                bg-gray-800 text-white px-2 py-1 rounded">
                    {action.label}
                  </div>
                </Button>
              ))}
            </div>

            {session?.status === 'SCAN_QR_CODE' && (
              <div className="text-center">
                <Button
                  onClick={() => handleConnectWhatsApp(sessionName)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <QrCode className="h-4 w-4 mr-2" />
                  Connecter WhatsApp
                </Button>
              </div>
            )}

            {session?.status === 'WORKING' && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Session active et connectée à WhatsApp
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const handleStartSession = async (sessionName: string) => {
    try {
      await startSession(sessionName);
      toast.success('Session démarrée');
    } catch (error) {
      toast.error('Erreur lors du démarrage');
    }
  };

  const handleConnectWhatsApp = async (sessionName: string) => {
    setSelectedSession(sessionName);
    setShowQRModal(true);
    startConnectionProcess(sessionName);
  };

  const handleGetQR = async (sessionName: string) => {
    try {
      const result = await getQRCode(sessionName);
      setQrCodeData(result?.qr || '');
    } catch (error) {
      console.error('Erreur QR:', error);
    }
  };

  const handleRestartSession = async (sessionName: string) => {
    try {
      await stopSession(sessionName);
      setTimeout(async () => {
        await startSession(sessionName);
        toast.success('Session redémarrée');
      }, 2000);
    } catch (error) {
      toast.error('Erreur lors du redémarrage');
    }
  };

  const handleDisconnectSession = async (sessionName: string) => {
    try {
      await stopSession(sessionName);
      toast.success('Session déconnectée');
    } catch (error) {
      toast.error('Erreur lors de la déconnexion');
    }
  };

  const handleDeleteSession = async (sessionName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer la session ${sessionName} ?`)) {
      return;
    }

    try {
      await deleteSession(sessionName);
      toast.success('Session supprimée');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleViewDetails = (sessionName: string) => {
    const session = sessions.find(s => s.name === sessionName);
    if (session) {
      setSessionDetails({
        name: session.name,
        status: session.status,
        phoneNumber: session.config?.metadata?.phone_number,
        lastActivity: session.lastActivity,
        messagesCount: Math.floor(Math.random() * 1000), // Simulé
        webhookStatus: 'connected'
      });
      setSelectedSession(sessionName);
      setShowSessionDetails(true);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'WORKING': return 'bg-green-500';
      case 'FAILED': return 'bg-red-500';
      case 'SCAN_QR_CODE': return 'bg-orange-500';
      case 'STARTING': return 'bg-blue-500';
      case 'DISCONNECTED': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'WORKING': return <CheckCircle2 className="h-4 w-4" />;
      case 'FAILED': return <AlertCircle className="h-4 w-4" />;
      case 'SCAN_QR_CODE': return <QrCode className="h-4 w-4" />;
      case 'STARTING': return <Clock className="h-4 w-4" />;
      case 'DISCONNECTED': return <PowerOff className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const stats = {
    total: sessions.length,
    working: sessions.filter(s => s.status === 'WORKING').length,
    pending: sessions.filter(s => s.status === 'SCAN_QR_CODE').length,
    failed: sessions.filter(s => s.status === 'FAILED').length
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="space-y-6 p-6">
        {/* Header avec style WAHA */}
        <div className="flex items-center justify-between border-b border-gray-700 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-white">WhatsApp Connect Dashboard</h1>
            <p className="text-gray-400">Sessions WAHA - API WhatsApp Business</p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => setAutoRefresh(!autoRefresh)}
              variant="outline"
              size="sm"
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
              Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
            </Button>
            <Button 
              onClick={() => setShowCreateModal(true)} 
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle Session
            </Button>
          </div>
        </div>

        {/* Statistiques rapides - Style moderne sombre */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Sessions</p>
                  <p className="text-2xl font-bold text-white">{stats.total}</p>
                </div>
                <Smartphone className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Actives</p>
                  <p className="text-2xl font-bold text-green-400">{stats.working}</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">En Attente</p>
                  <p className="text-2xl font-bold text-orange-400">{stats.pending}</p>
                </div>
                <Clock className="w-8 h-8 text-orange-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Échecs</p>
                  <p className="text-2xl font-bold text-red-400">{stats.failed}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Affichage de la session créée avec actions immédiates */}
        {createdSession && (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-green-400 mb-2">
                ✅ Session créée avec succès !
              </h2>
              <p className="text-gray-400">
                Votre session "{createdSession}" est maintenant disponible avec les actions immédiates
              </p>
            </div>
            <SessionImmediateActions 
              sessionName={createdSession} 
              onClose={() => setCreatedSession(null)} 
            />
          </div>
        )}

        {/* Liste des sessions - Style WAHA */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="border-b border-gray-700">
            <CardTitle className="flex items-center gap-2 text-white">
              <Activity className="h-5 w-5" />
              Sessions WhatsApp
              {loading && <Loader2 className="h-4 w-4 animate-spin text-blue-400" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-1">
              {sessions.length === 0 ? (
                <div className="text-center py-12">
                  <Smartphone className="h-16 w-16 mx-auto text-gray-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2 text-white">Aucune session trouvée</h3>
                  <p className="text-gray-400 mb-4">Créez votre première session WhatsApp pour commencer</p>
                  <Button onClick={() => setShowCreateModal(true)} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Créer une session
                  </Button>
                </div>
              ) : (
                sessions.map((session) => (
                  <Card key={session.name} className="border border-gray-700 bg-gray-800/50 m-2">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        {/* Nom de session à gauche */}
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(session.status)}`} />
                          <span className="text-white font-medium text-lg">{session.name}</span>
                        </div>

                        {/* Boutons d'action à droite - Style WAHA */}
                        <div className="flex items-center gap-2">
                          {/* Bouton principal selon le statut */}
                          {session.status === 'SCAN_QR_CODE' && (
                            <Button
                              size="sm"
                              onClick={() => handleConnectWhatsApp(session.name)}
                              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-full text-sm font-medium"
                            >
                              SCAN_QR_CODE
                            </Button>
                          )}
                          {session.status === 'DISCONNECTED' && (
                            <Button
                              size="sm"
                              onClick={() => handleConnectWhatsApp(session.name)}
                              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-full text-sm font-medium"
                            >
                              CONNECTER
                            </Button>
                          )}
                          {session.status === 'WORKING' && (
                            <Button
                              size="sm"
                              onClick={() => handleDisconnectSession(session.name)}
                              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-full text-sm font-medium"
                            >
                              WORKING
                            </Button>
                          )}
                          {session.status === 'STARTING' && (
                            <Button
                              size="sm"
                              disabled
                              className="bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium"
                            >
                              STARTING...
                            </Button>
                          )}

                          {/* Boutons d'action secondaires */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRestartSession(session.name)}
                            className="w-10 h-10 rounded-full border-gray-600 hover:bg-gray-700 p-0"
                            title="Redémarrer"
                          >
                            <RotateCcw className="h-4 w-4 text-gray-300" />
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleGetQR(session.name)}
                            className="w-10 h-10 rounded-full border-gray-600 hover:bg-gray-700 p-0"
                            title="QR Code"
                          >
                            <QrCode className="h-4 w-4 text-gray-300" />
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewDetails(session.name)}
                            className="w-10 h-10 rounded-full border-gray-600 hover:bg-gray-700 p-0"
                            title="Paramètres"
                          >
                            <Settings className="h-4 w-4 text-gray-300" />
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStartSession(session.name)}
                            className="w-10 h-10 rounded-full border-gray-600 hover:bg-gray-700 p-0"
                            title="Démarrer"
                          >
                            <Play className="h-4 w-4 text-gray-300" />
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDisconnectSession(session.name)}
                            className="w-10 h-10 rounded-full border-gray-600 hover:bg-gray-700 p-0"
                            title="Arrêter"
                          >
                            <Square className="h-4 w-4 text-gray-300" />
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteSession(session.name)}
                            className="w-10 h-10 rounded-full border-red-600 hover:bg-red-700 p-0"
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4 text-red-400" />
                          </Button>

                          {/* Indicateur WAHA */}
                          <div className="text-xs text-gray-400 font-mono ml-2">WAHA</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de création de session */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Plus className="h-5 w-5" />
              Créer une nouvelle session
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-300">Nom de la session</label>
              <Input
                placeholder="ex: session_principale"
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateSession()}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateModal(false)} className="border-gray-600 text-gray-300">
                Annuler
              </Button>
              <Button 
                onClick={handleCreateSession}
                disabled={!newSessionName.trim() || loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                Créer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal QR Code avec processus de connexion */}
      <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
        <DialogContent className="max-w-md bg-gray-800 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <QrCode className="h-5 w-5" />
              Connexion WhatsApp - {selectedSession}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Barre de progression */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-300">
                <span>Progression de connexion</span>
                <span>{connectionProgress}%</span>
              </div>
              <Progress value={connectionProgress} className="h-2" />
            </div>

            {/* Étapes du processus */}
            <div className="space-y-3">
              {sessionSteps.map((step) => (
                <div key={step.id} className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    step.status === 'completed' ? 'bg-green-500 text-white' :
                    step.status === 'active' ? 'bg-blue-500 text-white' :
                    step.status === 'error' ? 'bg-red-500 text-white' :
                    'bg-gray-600 text-gray-400'
                  }`}>
                    {step.status === 'completed' ? '✓' : step.id}
                  </div>
                  <div className="flex-1">
                    <div className={`font-medium ${step.status === 'active' ? 'text-blue-400' : 'text-gray-300'}`}>
                      {step.name}
                    </div>
                    <div className="text-sm text-gray-500">{step.description}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* QR Code */}
            {qrCodeData && (
              <div className="text-center">
                <div className="bg-white p-4 rounded-lg inline-block">
                  <img 
                    src={`data:image/png;base64,${qrCodeData}`} 
                    alt="QR Code WhatsApp" 
                    className="w-48 h-48"
                  />
                </div>
                <p className="text-sm text-gray-400 mt-2">
                  Scannez ce QR code avec WhatsApp
                </p>
                {/* Bouton pour simuler le scan en développement */}
                <Button 
                  onClick={handleQRScanned}
                  className="mt-4 bg-green-600 hover:bg-green-700"
                  size="sm"
                >
                  Simuler scan (Dev)
                </Button>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowQRModal(false)} className="border-gray-600 text-gray-300">
                Fermer
              </Button>
              {isConnecting && (
                <Button onClick={() => setIsConnecting(false)} className="bg-red-600 hover:bg-red-700">
                  Annuler
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal détails de session */}
      <Dialog open={showSessionDetails} onOpenChange={setShowSessionDetails}>
        <DialogContent className="max-w-2xl bg-gray-800 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Settings className="h-5 w-5" />
              Détails de la session - {sessionDetails?.name}
            </DialogTitle>
          </DialogHeader>
          {sessionDetails && (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-gray-700">
                <TabsTrigger value="overview" className="text-gray-300">Vue d'ensemble</TabsTrigger>
                <TabsTrigger value="messages" className="text-gray-300">Messages</TabsTrigger>
                <TabsTrigger value="settings" className="text-gray-300">Paramètres</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card className="bg-gray-700 border-gray-600">
                    <CardContent className="p-4">
                      <div className="text-sm text-gray-400">Statut</div>
                      <div className="text-lg font-semibold text-white">{sessionDetails.status}</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gray-700 border-gray-600">
                    <CardContent className="p-4">
                      <div className="text-sm text-gray-400">Numéro</div>
                      <div className="text-lg font-semibold text-white">{sessionDetails.phoneNumber || 'Non connecté'}</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gray-700 border-gray-600">
                    <CardContent className="p-4">
                      <div className="text-sm text-gray-400">Messages envoyés</div>
                      <div className="text-lg font-semibold text-white">{sessionDetails.messagesCount}</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gray-700 border-gray-600">
                    <CardContent className="p-4">
                      <div className="text-sm text-gray-400">Webhook</div>
                      <div className="text-lg font-semibold text-white">{sessionDetails.webhookStatus}</div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="messages" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input placeholder="Numéro de téléphone" className="bg-gray-700 border-gray-600 text-white" />
                    <Input placeholder="Message de test" className="bg-gray-700 border-gray-600 text-white" />
                    <Button className="bg-green-600 hover:bg-green-700">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Envoyer
                    </Button>
                  </div>
                  <Alert className="bg-gray-700 border-gray-600">
                    <AlertDescription className="text-gray-300">
                      Utilisez cette fonction pour tester l'envoi de messages via cette session.
                    </AlertDescription>
                  </Alert>
                </div>
              </TabsContent>
              
              <TabsContent value="settings" className="space-y-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Button className="bg-orange-600 hover:bg-orange-700">
                      <QrCode className="h-4 w-4 mr-2" />
                      Regénérer QR Code
                    </Button>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Redémarrer Session
                    </Button>
                    <Button className="bg-yellow-600 hover:bg-yellow-700">
                      <PowerOff className="h-4 w-4 mr-2" />
                      Déconnecter
                    </Button>
                    <Button variant="destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Supprimer Session
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CompleteSessionManager;