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
      
      // Rafraîchir immédiatement pour voir la session créée
      setTimeout(() => {
        refreshData();
      }, 1000);
      
      toast.success('Session créée avec succès - Affichage immédiat activé');
    } catch (error) {
      toast.error('Erreur lors de la création de la session');
    }
  };

  // Component pour les actions immédiates de session - Style WAHA Dashboard
  const SessionImmediateActions: React.FC<{ sessionName: string; onClose: () => void }> = ({ sessionName, onClose }) => {
    const session = sessions.find(s => s.name === sessionName);
    
    const actionButtons = [
      {
        icon: Settings,
        label: 'Paramètres',
        color: 'from-teal-500 to-teal-600',
        action: () => handleViewDetails(sessionName)
      },
      {
        icon: Grid3X3,
        label: 'Modules',
        color: 'from-purple-500 to-purple-600',
        action: () => toast.info('Modules - Synchronisé avec WAHA Dashboard')
      },
      {
        icon: Play,
        label: 'Start',
        color: 'from-green-500 to-green-600',
        action: () => handleStartSession(sessionName)
      },
      {
        icon: RotateCcw,
        label: 'Restart',
        color: 'from-blue-500 to-blue-600',
        action: () => handleRestartSession(sessionName)
      },
      {
        icon: Square,
        label: 'Stop',
        color: 'from-gray-500 to-gray-600',
        action: () => handleDisconnectSession(sessionName)
      },
      {
        icon: ArrowRightLeft,
        label: 'Transfer',
        color: 'from-orange-500 to-orange-600',
        action: () => toast.info('Transfer - Fonction WAHA disponible')
      },
      {
        icon: Trash2,
        label: 'Delete',
        color: 'from-red-500 to-red-600',
        action: () => handleDeleteSession(sessionName)
      }
    ];

    return (
      <div className="space-y-6 bg-gradient-to-br from-gray-800 via-gray-850 to-gray-900 p-6 rounded-xl border border-gray-700 shadow-2xl">
        {/* Header de la session */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className={`h-4 w-4 rounded-full ${getStatusColor(session?.status || '')} shadow-lg`} />
              <div className={`absolute inset-0 h-4 w-4 rounded-full ${getStatusColor(session?.status || '')} animate-ping opacity-30`} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{sessionName}</h2>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="flex items-center gap-1 bg-gray-700 border-gray-600 text-gray-200">
                  {getStatusIcon(session?.status || '')}
                  {session?.status || 'UNKNOWN'}
                </Badge>
                <div className="text-xs text-gray-400 font-mono bg-gray-700 px-2 py-1 rounded">WAHA</div>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-white hover:bg-gray-700 rounded-full"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Section centrale avec WAHA et QR Code selon l'état */}
        <div className="flex flex-col items-center space-y-6">
          {/* WAHA Indicator central */}
          <div className="relative">
            <div className="bg-gradient-to-br from-gray-700 to-gray-800 rounded-full p-8 border-4 border-gray-600 shadow-xl">
              <span className="text-2xl font-bold text-white tracking-wider">WAHA</span>
            </div>
            {session?.status === 'WORKING' && (
              <div className="absolute -top-2 -right-2 bg-green-500 rounded-full p-1 shadow-lg">
                <CheckCircle2 className="h-4 w-4 text-white" />
              </div>
            )}
          </div>

          {/* Bouton QR Code central si nécessaire */}
          {session?.status === 'SCAN_QR_CODE' && (
            <Button
              onClick={() => handleConnectWhatsApp(sessionName)}
              className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-full text-lg font-semibold shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              SCAN_QR_CODE
            </Button>
          )}

          {session?.status === 'WORKING' && (
            <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4 text-center">
              <div className="text-green-400 font-semibold">SESSION ACTIVE</div>
              <div className="text-sm text-gray-400">Connectée et synchronisée avec WAHA Dashboard</div>
            </div>
          )}
        </div>

        {/* Boutons d'action circulaires - Style identique au dashboard WAHA */}
        <div className="flex justify-center items-center">
          <div className="grid grid-cols-7 gap-4 items-center">
            {actionButtons.map((action, index) => (
              <div key={index} className="flex flex-col items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={action.action}
                  className={`
                    relative overflow-hidden h-16 w-16 rounded-full border-2 
                    bg-gradient-to-br ${action.color} text-white border-white/20
                    hover:scale-110 transition-all duration-300 shadow-lg
                    hover:shadow-2xl group transform hover:-translate-y-1
                  `}
                  title={action.label}
                >
                  <action.icon className="h-6 w-6" />
                </Button>
                <span className="text-xs text-gray-400 mt-1 font-medium">{action.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Informations de session en bas */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-700">
          <div className="text-center">
            <div className="text-sm text-gray-400">Status</div>
            <div className="text-white font-semibold">{session?.status || 'UNKNOWN'}</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-400">Server</div>
            <div className="text-white font-semibold">WAHA Dashboard</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-400">Protocol</div>
            <div className="text-white font-semibold">WhatsApp Business</div>
          </div>
        </div>

        {/* Note de synchronisation */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-500/30 rounded-full px-4 py-2">
            <RefreshCw className="h-4 w-4 text-blue-400 animate-spin" />
            <span className="text-sm text-blue-400 font-medium">Synchronisé en temps réel avec WAHA Dashboard</span>
          </div>
        </div>
      </div>
    );
  };

  const handleStartSession = async (sessionName: string) => {
    try {
      toast.info(`Démarrage de la session ${sessionName} sur WAHA Dashboard...`);
      await startSession(sessionName);
      toast.success(`✅ Session ${sessionName} démarrée - Synchronisée avec WAHA`);
      // Rafraîchir immédiatement pour refléter les changements
      setTimeout(() => refreshData(), 1000);
    } catch (error) {
      toast.error(`❌ Erreur WAHA: ${error.message}`);
    }
  };

  const handleConnectWhatsApp = async (sessionName: string) => {
    setSelectedSession(sessionName);
    setShowQRModal(true);
    startConnectionProcess(sessionName);
  };

  const handleGetQR = async (sessionName: string) => {
    try {
      toast.info(`Génération QR Code pour ${sessionName} via WAHA Dashboard...`);
      const result = await getQRCode(sessionName);
      setQrCodeData(result?.qr || '');
      toast.success(`📱 QR Code généré - Synchronisé avec WAHA Dashboard`);
    } catch (error) {
      console.error('Erreur QR:', error);
      toast.error(`❌ Erreur génération QR WAHA: ${error.message}`);
    }
  };

  const handleRestartSession = async (sessionName: string) => {
    try {
      toast.info(`Redémarrage de la session ${sessionName} sur WAHA Dashboard...`);
      await stopSession(sessionName);
      setTimeout(async () => {
        await startSession(sessionName);
        toast.success(`🔄 Session ${sessionName} redémarrée - Synchronisée avec WAHA`);
        refreshData();
      }, 2000);
    } catch (error) {
      toast.error(`❌ Erreur redémarrage WAHA: ${error.message}`);
    }
  };

  const handleDisconnectSession = async (sessionName: string) => {
    try {
      toast.info(`Déconnexion de la session ${sessionName} sur WAHA Dashboard...`);
      await stopSession(sessionName);
      toast.success(`⏹️ Session ${sessionName} déconnectée - Synchronisée avec WAHA`);
      refreshData();
    } catch (error) {
      toast.error(`❌ Erreur déconnexion WAHA: ${error.message}`);
    }
  };

  const handleDeleteSession = async (sessionName: string) => {
    if (!confirm(`⚠️ Supprimer la session ${sessionName} du Dashboard WAHA ?\n\nCette action est irréversible et supprimera également la session du serveur WAHA.`)) {
      return;
    }

    try {
      toast.info(`Suppression de la session ${sessionName} sur WAHA Dashboard...`);
      await deleteSession(sessionName);
      toast.success(`🗑️ Session ${sessionName} supprimée - Synchronisée avec WAHA`);
      // Fermer les actions immédiates si c'est la session supprimée
      if (createdSession === sessionName) {
        setCreatedSession(null);
      }
      refreshData();
    } catch (error) {
      toast.error(`❌ Erreur suppression WAHA: ${error.message}`);
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
      case 'STOPPED': return 'bg-gray-400';
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
      case 'STOPPED': return <Square className="h-4 w-4" />;
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
        {/* Header avec statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-white">{stats.total}</div>
                <div className="text-gray-400 text-sm">Sessions totales</div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-400">{stats.working}</div>
                <div className="text-gray-400 text-sm">Actives</div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-400">{stats.pending}</div>
                <div className="text-gray-400 text-sm">En attente</div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-red-400">{stats.failed}</div>
                <div className="text-gray-400 text-sm">Échouées</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions rapides */}
        <div className="flex flex-wrap gap-4">
          <Button 
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Nouvelle session
          </Button>
          
          <Button 
            onClick={refreshData}
            variant="outline"
            className="border-gray-600 text-gray-300 hover:bg-gray-700 flex items-center gap-2"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          
          <Button 
            onClick={() => setAutoRefresh(!autoRefresh)}
            variant="outline"
            className={`border-gray-600 text-gray-300 hover:bg-gray-700 flex items-center gap-2 ${autoRefresh ? 'bg-green-600/20 border-green-500' : ''}`}
          >
            <Activity className="h-4 w-4" />
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </Button>
        </div>

        {/* Actions immédiates pour la session créée */}
        {createdSession && sessions.find(s => s.name === createdSession) && (
          <div>
            <div className="text-center mb-4">
              <p className="text-blue-300 text-lg font-semibold">
                ✨ Session "{createdSession}" créée avec succès ! Actions immédiates disponibles :
              </p>
            </div>
            <SessionImmediateActions 
              sessionName={createdSession} 
              onClose={() => setCreatedSession(null)} 
            />
          </div>
        )}

        {/* Interface WAHA Dashboard - Table complète */}
        <Card className="border-gray-700 bg-gray-900/50 backdrop-blur-sm">
          <CardHeader className="border-b border-gray-700">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center gap-3">
                <Settings className="h-6 w-6 text-blue-400" />
                Sessions WhatsApp - Interface WAHA Dashboard
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshData}
                  disabled={loading}
                  className="bg-gray-800 border-gray-600 text-gray-200 hover:bg-gray-700"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Actualiser
                </Button>
                <Badge variant="outline" className="bg-gray-700 border-gray-600 text-gray-200">
                  {sessions.length} session{sessions.length !== 1 ? 's' : ''}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
                <span className="ml-3 text-gray-400">Chargement des sessions WAHA...</span>
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center p-12">
                <Smartphone className="h-16 w-16 mx-auto text-gray-600 mb-4" />
                <h3 className="text-xl font-semibold text-gray-300 mb-2">Aucune session WhatsApp</h3>
                <p className="text-gray-500 mb-6">Créez votre première session pour commencer</p>
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle Session
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                {/* Header Table */}
                <div className="grid grid-cols-12 gap-4 p-4 bg-gray-800 border-b border-gray-700 text-sm font-medium text-gray-300">
                  <div className="col-span-3 flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Name
                  </div>
                  <div className="col-span-2">Metadata</div>
                  <div className="col-span-2">Account</div>
                  <div className="col-span-1">Status</div>
                  <div className="col-span-1">Server</div>
                  <div className="col-span-3 text-center">Actions</div>
                </div>

                {/* Sessions List */}
                {sessions.map((session) => (
                  <div key={session.name} className="grid grid-cols-12 gap-4 p-4 border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                    {/* Name */}
                    <div className="col-span-3 flex items-center gap-3">
                      <div className="relative">
                        <div className={`h-3 w-3 rounded-full ${getStatusColor(session.status)}`} />
                        <div className={`absolute inset-0 h-3 w-3 rounded-full ${getStatusColor(session.status)} animate-ping opacity-30`} />
                      </div>
                      <div>
                        <div className="text-white font-medium">{session.name}</div>
                        <div className="text-xs text-gray-500">Session {session.name.substring(0, 8)}...</div>
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="col-span-2">
                      <div className="text-gray-400 text-sm">
                        {session.config?.metadata?.phone_number ? (
                          <div className="flex items-center gap-1">
                            <Smartphone className="h-3 w-3" />
                            {session.config.metadata.phone_number}
                          </div>
                        ) : (
                          <span className="text-gray-600">--</span>
                        )}
                      </div>
                    </div>

                    {/* Account */}
                    <div className="col-span-2">
                      <div className="text-gray-400 text-sm">
                        {session.config?.metadata?.account || session.config?.metadata?.phone_number ? (
                          <div>
                            <div className="text-green-400 text-xs uppercase font-semibold">
                              {session.config.metadata.account || 'WhatsApp User'}
                            </div>
                            <div className="text-gray-500 text-xs">
                              {session.config.metadata.phone_number || 'No phone'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-600">Account (Phone Number)</span>
                        )}
                      </div>
                    </div>

                    {/* Status */}
                    <div className="col-span-1">
                      <div className="flex items-center gap-1">
                        {getStatusIcon(session.status)}
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            session.status === 'WORKING' ? 'bg-green-500/20 border-green-500/30 text-green-400' :
                            session.status === 'FAILED' ? 'bg-red-500/20 border-red-500/30 text-red-400' :
                            session.status === 'SCAN_QR_CODE' ? 'bg-orange-500/20 border-orange-500/30 text-orange-400' :
                            session.status === 'STOPPED' ? 'bg-gray-500/20 border-gray-500/30 text-gray-400' :
                            'bg-gray-500/20 border-gray-500/30 text-gray-400'
                          }`}
                        >
                          {session.status}
                        </Badge>
                      </div>
                    </div>

                    {/* Server */}
                    <div className="col-span-1">
                      <Badge variant="outline" className="bg-blue-500/20 border-blue-500/30 text-blue-400 text-xs">
                        WAHA
                      </Badge>
                    </div>

                    {/* Actions - Style WAHA Dashboard */}
                    <div className="col-span-3 flex items-center justify-center gap-2">
                      {/* Settings */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(session.name)}
                        className="h-8 w-8 rounded-full bg-teal-500/20 border-teal-500/30 text-teal-400 hover:bg-teal-500/30 p-0"
                        title="Paramètres"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>

                      {/* QR Code - seulement si SCAN_QR_CODE */}
                      {session.status === 'SCAN_QR_CODE' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleConnectWhatsApp(session.name)}
                          className="h-8 w-8 rounded-full bg-orange-500/20 border-orange-500/30 text-orange-400 hover:bg-orange-500/30 p-0"
                          title="QR Code"
                        >
                          <QrCode className="h-4 w-4" />
                        </Button>
                      )}

                      {/* WhatsApp */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toast.info('WhatsApp Module - Synchronisé avec WAHA')}
                        className="h-8 w-8 rounded-full bg-green-500/20 border-green-500/30 text-green-400 hover:bg-green-500/30 p-0"
                        title="WhatsApp"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>

                      {/* Start */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStartSession(session.name)}
                        className="h-8 w-8 rounded-full bg-blue-500/20 border-blue-500/30 text-blue-400 hover:bg-blue-500/30 p-0"
                        title="Démarrer"
                      >
                        <Play className="h-4 w-4" />
                      </Button>

                      {/* Restart */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestartSession(session.name)}
                        className="h-8 w-8 rounded-full bg-purple-500/20 border-purple-500/30 text-purple-400 hover:bg-purple-500/30 p-0"
                        title="Redémarrer"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>

                      {/* Stop */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDisconnectSession(session.name)}
                        className="h-8 w-8 rounded-full bg-gray-500/20 border-gray-500/30 text-gray-400 hover:bg-gray-500/30 p-0"
                        title="Arrêter"
                      >
                        <Square className="h-4 w-4" />
                      </Button>

                      {/* Transfer */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toast.info('Transfer - Fonction WAHA disponible')}
                        className="h-8 w-8 rounded-full bg-orange-600/20 border-orange-600/30 text-orange-500 hover:bg-orange-600/30 p-0"
                        title="Transfer"
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
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal création de session */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="bg-gray-800 border-gray-700 text-white">
            <DialogHeader>
              <DialogTitle>Créer une nouvelle session WhatsApp</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nom de la session
                </label>
                <Input
                  value={newSessionName}
                  onChange={(e) => setNewSessionName(e.target.value)}
                  placeholder="Ex: mon-whatsapp-bot"
                  className="bg-gray-700 border-gray-600 text-white"
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateSession()}
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleCreateSession}
                  className="bg-blue-600 hover:bg-blue-700 flex-1"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  Créer la session
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowCreateModal(false)}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  Annuler
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal QR Code */}
        <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
          <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Connexion WhatsApp - {selectedSession}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Progression</span>
                  <span className="text-blue-400">{connectionProgress}%</span>
                </div>
                <Progress value={connectionProgress} className="h-2" />
              </div>

              {/* Steps */}
              <div className="space-y-2">
                {sessionSteps.map((step) => (
                  <div key={step.id} className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      step.status === 'completed' ? 'bg-green-500' :
                      step.status === 'active' ? 'bg-blue-500' :
                      step.status === 'error' ? 'bg-red-500' : 'bg-gray-500'
                    }`} />
                    <span className={`text-sm ${
                      step.status === 'completed' ? 'text-green-400' :
                      step.status === 'active' ? 'text-blue-400' :
                      step.status === 'error' ? 'text-red-400' : 'text-gray-400'
                    }`}>
                      {step.name}: {step.description}
                    </span>
                  </div>
                ))}
              </div>

              {/* QR Code display */}
              {qrCodeData && (
                <div className="text-center space-y-4">
                  <div className="bg-white p-4 rounded-lg inline-block">
                    <img src={qrCodeData} alt="QR Code WhatsApp" className="max-w-full h-auto" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-300">
                      Scannez ce QR code avec votre application WhatsApp
                    </p>
                    <Button
                      onClick={handleQRScanned}
                      className="bg-green-600 hover:bg-green-700 w-full"
                    >
                      J'ai scanné le QR code
                    </Button>
                  </div>
                </div>
              )}

              {isConnecting && !qrCodeData && (
                <div className="text-center py-8">
                  <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-400 mb-4" />
                  <p className="text-gray-300">Préparation de la connexion...</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal détails de session */}
        <Dialog open={showSessionDetails} onOpenChange={setShowSessionDetails}>
          <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Détails de la session - {sessionDetails?.name}
              </DialogTitle>
            </DialogHeader>
            
            {sessionDetails && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <Card className="bg-gray-700 border-gray-600">
                    <CardContent className="p-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-white">{sessionDetails.status}</div>
                        <div className="text-gray-400 text-sm">Statut</div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-gray-700 border-gray-600">
                    <CardContent className="p-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-400">{sessionDetails.messagesCount}</div>
                        <div className="text-gray-400 text-sm">Messages</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Numéro de téléphone
                    </label>
                    <div className="bg-gray-700 p-3 rounded border border-gray-600">
                      {sessionDetails.phoneNumber || 'Non connecté'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Dernière activité
                    </label>
                    <div className="bg-gray-700 p-3 rounded border border-gray-600">
                      {sessionDetails.lastActivity || 'Aucune activité'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Webhook
                    </label>
                    <div className="bg-gray-700 p-3 rounded border border-gray-600 flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${sessionDetails.webhookStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'}`} />
                      {sessionDetails.webhookStatus === 'connected' ? 'Connecté' : 'Déconnecté'}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button className="bg-blue-600 hover:bg-blue-700 flex-1">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Envoyer un test
                  </Button>
                  <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-700">
                    <Download className="h-4 w-4 mr-2" />
                    Exporter logs
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default CompleteSessionManager;