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
  Globe
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
      toast.success('Session créée avec succès');
    } catch (error) {
      toast.error('Erreur lors de la création de la session');
    }
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

  const getSessionActions = (session: any) => {
    const actions = [];

    switch (session.status) {
      case 'DISCONNECTED':
      case 'FAILED':
        actions.push(
          <Button
            key="connect"
            size="sm"
            onClick={() => handleConnectWhatsApp(session.name)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Smartphone className="h-4 w-4 mr-1" />
            Connecter WhatsApp
          </Button>
        );
        break;
      
      case 'SCAN_QR_CODE':
        actions.push(
          <Button
            key="qr"
            size="sm"
            variant="outline"
            onClick={() => handleGetQR(session.name)}
          >
            <QrCode className="h-4 w-4 mr-1" />
            Voir QR Code
          </Button>
        );
        break;
      
      case 'WORKING':
        actions.push(
          <Button
            key="disconnect"
            size="sm"
            variant="outline"
            onClick={() => handleDisconnectSession(session.name)}
          >
            <PowerOff className="h-4 w-4 mr-1" />
            Déconnecter
          </Button>
        );
        break;
    }

    // Actions communes
    actions.push(
      <Button
        key="restart"
        size="sm"
        variant="outline"
        onClick={() => handleRestartSession(session.name)}
      >
        <RotateCcw className="h-4 w-4 mr-1" />
        Redémarrer
      </Button>,
      <Button
        key="details"
        size="sm"
        variant="outline"
        onClick={() => handleViewDetails(session.name)}
      >
        <Settings className="h-4 w-4 mr-1" />
        Détails
      </Button>,
      <Button
        key="delete"
        size="sm"
        variant="destructive"
        onClick={() => handleDeleteSession(session.name)}
      >
        <Trash2 className="h-4 w-4 mr-1" />
        Supprimer
      </Button>
    );

    return actions;
  };

  const stats = {
    total: sessions.length,
    working: sessions.filter(s => s.status === 'WORKING').length,
    pending: sessions.filter(s => s.status === 'SCAN_QR_CODE').length,
    failed: sessions.filter(s => s.status === 'FAILED').length
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header avec statistiques */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestionnaire de Sessions WhatsApp</h1>
          <p className="text-muted-foreground">Gestion complète de vos sessions WhatsApp Business API</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setAutoRefresh(!autoRefresh)}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
          </Button>
          <Button onClick={() => setShowCreateModal(true)} className="bg-green-600 hover:bg-green-700">
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle Session
          </Button>
        </div>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100">Total Sessions</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Smartphone className="w-8 h-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100">Actives</p>
                <p className="text-2xl font-bold">{stats.working}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100">En Attente</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100">Échecs</p>
                <p className="text-2xl font-bold">{stats.failed}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Sessions WhatsApp
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sessions.length === 0 ? (
              <div className="text-center py-12">
                <Smartphone className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Aucune session trouvée</h3>
                <p className="text-muted-foreground mb-4">Créez votre première session WhatsApp pour commencer</p>
                <Button onClick={() => setShowCreateModal(true)} className="bg-green-600 hover:bg-green-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Créer une session
                </Button>
              </div>
            ) : (
              sessions.map((session) => (
                <Card key={session.name} className="border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(session.status)}`} />
                        <div>
                          <h3 className="font-semibold">{session.name}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {getStatusIcon(session.status)}
                            <span>{session.status}</span>
                            {session.config?.metadata?.phone_number && (
                              <>
                                <span>•</span>
                                <span>{session.config.metadata.phone_number}</span>
                              </>
                            )}
                            {session.lastActivity && (
                              <>
                                <span>•</span>
                                <span>Dernière activité: {new Date(session.lastActivity).toLocaleString()}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {getSessionActions(session)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal de création de session */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Créer une nouvelle session
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nom de la session</label>
              <Input
                placeholder="ex: session_principale"
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateSession()}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Annuler
              </Button>
              <Button 
                onClick={handleCreateSession}
                disabled={!newSessionName.trim() || loading}
                className="bg-green-600 hover:bg-green-700"
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Connexion WhatsApp - {selectedSession}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Barre de progression */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
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
                    'bg-gray-200 text-gray-600'
                  }`}>
                    {step.status === 'completed' ? '✓' : 
                     step.status === 'active' ? <Loader2 className="h-3 w-3 animate-spin" /> :
                     step.id}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{step.name}</p>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* QR Code */}
            {qrCodeData && (
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-lg border flex items-center justify-center">
                  <img 
                    src={qrCodeData} 
                    alt="QR Code WhatsApp" 
                    className="w-48 h-48 object-contain"
                  />
                </div>
                <Alert>
                  <Smartphone className="h-4 w-4" />
                  <AlertDescription>
                    Scannez ce QR code avec l'application WhatsApp sur votre téléphone pour établir la connexion.
                  </AlertDescription>
                </Alert>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={handleQRScanned}
                    className="flex-1"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    QR Code scanné
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => handleGetQR(selectedSession)}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowQRModal(false)}>
                Fermer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal détails de session */}
      <Dialog open={showSessionDetails} onOpenChange={setShowSessionDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Détails - {sessionDetails?.name}
            </DialogTitle>
          </DialogHeader>
          {sessionDetails && (
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
                <TabsTrigger value="activity">Activité</TabsTrigger>
                <TabsTrigger value="settings">Paramètres</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getStatusColor(sessionDetails.status)}>
                          {sessionDetails.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">Statut de la session</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <p className="text-lg font-semibold">{sessionDetails.phoneNumber || 'Non connecté'}</p>
                      <p className="text-sm text-muted-foreground">Numéro de téléphone</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <p className="text-lg font-semibold">{sessionDetails.messagesCount || 0}</p>
                      <p className="text-sm text-muted-foreground">Messages envoyés</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${sessionDetails.webhookStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="text-sm font-medium">{sessionDetails.webhookStatus}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">Webhook</p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="activity" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Activité récente</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <div>
                          <p className="text-sm font-medium">Session connectée</p>
                          <p className="text-xs text-muted-foreground">Il y a 2 heures</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                        <MessageSquare className="h-4 w-4 text-blue-500" />
                        <div>
                          <p className="text-sm font-medium">Message envoyé</p>
                          <p className="text-xs text-muted-foreground">Il y a 1 heure</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="settings" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Configuration</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Auto-redémarrage</p>
                        <p className="text-sm text-muted-foreground">Redémarre automatiquement en cas d'échec</p>
                      </div>
                      <Button variant="outline" size="sm">Configurer</Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Webhook URL</p>
                        <p className="text-sm text-muted-foreground">URL de notification des événements</p>
                      </div>
                      <Button variant="outline" size="sm">Modifier</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CompleteSessionManager;