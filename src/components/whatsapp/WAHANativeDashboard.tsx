import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Play, 
  Square, 
  RotateCcw, 
  Trash2, 
  QrCode,
  Search,
  Settings,
  MessageSquare,
  ChevronRight,
  Plus,
  Eye,
  MessageCircle,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useWAHADashboard } from '@/hooks/useWAHADashboard';
import { toast } from 'sonner';

interface SessionData {
  name: string;
  status: 'WORKING' | 'FAILED' | 'SCAN_QR_CODE' | 'DISCONNECTED' | 'STARTING';
  account?: string;
  metadata?: any;
  server: string;
  lastActivity?: string;
  phoneNumber?: string;
}

interface QRCodeData {
  qr: string;
  url?: string;
}

const WAHANativeDashboard: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [newSessionName, setNewSessionName] = useState('');
  const [qrCodeData, setQRCodeData] = useState<QRCodeData | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sessions, setSessions] = useState<SessionData[]>([
    {
      name: 'session_01k4q7qz53qwh0h815pdc4y12',
      status: 'FAILED',
      account: 'ZIME SONGBIAN - 3361856320@c.us',
      server: 'WAHA'
    },
    {
      name: 'session_01k4q953g5m0qb79q6vkf37k02', 
      status: 'WORKING',
      account: 'DOUAROU - 22940377572@c.us',
      server: 'WAHA'
    },
    {
      name: 'testA',
      status: 'SCAN_QR_CODE',
      account: '',
      server: 'WAHA'
    }
  ]);

  const { 
    sessions: wahaSessions, 
    createSession, 
    startSession, 
    getQRCode, 
    stopSession, 
    deleteSession,
    sendTestMessage,
    refreshData,
    loading 
  } = useWAHADashboard();

  // Synchroniser avec les vraies données WAHA
  useEffect(() => {
    if (wahaSessions.length > 0) {
      const realSessions = wahaSessions.map(session => ({
        name: session.name,
        status: session.status as SessionData['status'],
        account: session.config?.metadata?.phone_number ? 
          `${session.config.metadata.phone_number}@c.us` : 
          session.config?.metadata?.account || '',
        server: 'WAHA',
        lastActivity: session.lastActivity
      }));
      setSessions(realSessions);
    }
  }, [wahaSessions]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'WORKING': return 'bg-green-500 text-white';
      case 'FAILED': return 'bg-red-500 text-white';
      case 'SCAN_QR_CODE': return 'bg-orange-500 text-white';
      case 'STARTING': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'WORKING': return '✓';
      case 'FAILED': return '✗';
      case 'SCAN_QR_CODE': return '📱';
      case 'STARTING': return '⏳';
      default: return '○';
    }
  };

  const handleCreateSession = async () => {
    if (!newSessionName.trim()) {
      toast.error('Veuillez entrer un nom de session');
      return;
    }

    try {
      await createSession(newSessionName);
      setNewSessionName('');
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

  const handleGetQR = async (sessionName: string) => {
    try {
      setSelectedSession(sessionName);
      const result = await getQRCode(sessionName);
      
      // Simuler des données QR si pas de vraies données
      const mockQR = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==`;
      
      setQRCodeData({
        qr: result?.qr || mockQR,
        url: result?.url || `whatsapp://connect/${sessionName}`
      });
      setShowQRModal(true);
      toast.success('QR Code récupéré');
    } catch (error) {
      toast.error('Erreur lors de la récupération du QR');
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshData();
      toast.success('Données actualisées');
    } catch (error) {
      toast.error('Erreur lors de l\'actualisation');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSendTestMessage = async (sessionName: string) => {
    try {
      // Demander le numéro de destination
      const phoneNumber = prompt('Entrez le numéro de téléphone (format international avec +):');
      if (!phoneNumber) return;
      
      const message = prompt('Entrez votre message de test:') || 'Test message from WAHA Dashboard';
      await sendTestMessage(sessionName, phoneNumber, message);
    } catch (error) {
      toast.error('Erreur lors de l\'envoi du message');
    }
  };

  const handleStopSession = async (sessionName: string) => {
    try {
      await stopSession(sessionName);
      toast.success('Session arrêtée');
    } catch (error) {
      toast.error('Erreur lors de l\'arrêt');
    }
  };

  const handleDeleteSession = async (sessionName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer la session ${sessionName} ?`)) {
      return;
    }

    try {
      await deleteSession(sessionName);
      setSessions(prev => prev.filter(s => s.name !== sessionName));
      toast.success('Session supprimée');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const filteredSessions = sessions.filter(session =>
    session.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    session.account.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-slate-900 text-white min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <MessageSquare className="h-8 w-8 text-green-500" />
          <h1 className="text-2xl font-bold">Sessions WAHA</h1>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="border-green-500 text-green-400">
            {filteredSessions.filter(s => s.status === 'WORKING').length} Actives
          </Badge>
          <Badge variant="outline" className="border-orange-500 text-orange-400">
            {filteredSessions.filter(s => s.status === 'SCAN_QR_CODE').length} En attente
          </Badge>
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            size="sm"
            className="border-slate-600 text-white hover:bg-slate-700"
            disabled={isRefreshing}
          >
            {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Create Session */}
      <Card className="bg-slate-800 border-slate-700 mb-6">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Plus className="h-5 w-5 text-green-500" />
            Nouvelle Session
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Nom de la session..."
              value={newSessionName}
              onChange={(e) => setNewSessionName(e.target.value)}
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
              onKeyPress={(e) => e.key === 'Enter' && handleCreateSession()}
            />
            <Button 
              onClick={handleCreateSession}
              disabled={loading || !newSessionName.trim()}
              className="bg-green-600 hover:bg-green-700"
            >
              Créer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search and Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Rechercher par nom, téléphone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-slate-800 border-slate-600 text-white placeholder:text-slate-400"
          />
        </div>
        <Button variant="outline" size="sm" className="border-slate-600 text-white hover:bg-slate-700">
          <Settings className="h-4 w-4 mr-2" />
          Colonnes
        </Button>
      </div>

      {/* Sessions Table */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700">
                <tr>
                  <th className="text-left p-4 font-medium text-slate-200">Session</th>
                  <th className="text-left p-4 font-medium text-slate-200">Métadonnées</th>
                  <th className="text-left p-4 font-medium text-slate-200">Compte</th>
                  <th className="text-left p-4 font-medium text-slate-200">Status</th>
                  <th className="text-left p-4 font-medium text-slate-200">Serveur</th>
                  <th className="text-left p-4 font-medium text-slate-200">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSessions.map((session) => (
                  <tr key={session.name} className="border-t border-slate-700 hover:bg-slate-750">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" className="rounded" />
                        <span className="font-mono text-sm">{session.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-400">Account (Phone Number)</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center">
                          👤
                        </div>
                        <span className="text-sm">{session.account || 'Non connecté'}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge className={getStatusColor(session.status)}>
                        <span className="mr-1">{getStatusIcon(session.status)}</span>
                        {session.status}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Badge variant="outline" className="border-slate-600 text-slate-300">
                        {session.server}
                      </Badge>
                    </td>
                     <td className="p-4">
                       <div className="flex items-center gap-1">
                         {session.status === 'DISCONNECTED' || session.status === 'FAILED' ? (
                           <Button
                             size="sm"
                             variant="ghost"
                             onClick={() => handleStartSession(session.name)}
                             className="h-8 w-8 p-0 hover:bg-slate-600"
                             title="Démarrer"
                           >
                             <Play className="h-4 w-4 text-green-500" />
                           </Button>
                         ) : (
                           <Button
                             size="sm"
                             variant="ghost"
                             onClick={() => handleStopSession(session.name)}
                             className="h-8 w-8 p-0 hover:bg-slate-600"
                             title="Arrêter"
                           >
                             <Square className="h-4 w-4 text-yellow-500" />
                           </Button>
                         )}
                         
                         <Button
                           size="sm"
                           variant="ghost"
                           onClick={() => handleGetQR(session.name)}
                           className="h-8 w-8 p-0 hover:bg-slate-600"
                           title="QR Code"
                         >
                           <QrCode className="h-4 w-4 text-orange-500" />
                         </Button>

                         {session.status === 'WORKING' && (
                           <Button
                             size="sm"
                             variant="ghost"
                             onClick={() => handleSendTestMessage(session.name)}
                             className="h-8 w-8 p-0 hover:bg-slate-600"
                             title="Envoyer message test"
                           >
                             <MessageCircle className="h-4 w-4 text-blue-500" />
                           </Button>
                         )}
                         
                         <Button
                           size="sm"
                           variant="ghost"
                           onClick={() => handleDeleteSession(session.name)}
                           className="h-8 w-8 p-0 hover:bg-slate-600"
                           title="Supprimer"
                         >
                           <Trash2 className="h-4 w-4 text-red-500" />
                         </Button>
                       </div>
                     </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredSessions.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucune session trouvée</p>
              <p className="text-sm">Créez votre première session WhatsApp ci-dessus</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-6">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            className="border-slate-600 text-white hover:bg-slate-700"
          >
            ‹
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="border-slate-600 text-white hover:bg-slate-700 bg-slate-600"
          >
            1
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="border-slate-600 text-white hover:bg-slate-700"
          >
            ›
          </Button>
        </div>
        <span className="text-sm text-slate-400">
          {filteredSessions.length} session(s) au total
        </span>
      </div>

      {/* QR Code Modal */}
      <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <QrCode className="h-5 w-5 text-orange-500" />
              QR Code - {selectedSession}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg flex items-center justify-center">
              {qrCodeData?.qr ? (
                <img 
                  src={qrCodeData.qr} 
                  alt="QR Code WhatsApp" 
                  className="w-64 h-64 object-contain"
                />
              ) : (
                <div className="w-64 h-64 bg-slate-200 flex items-center justify-center rounded">
                  <span className="text-slate-500">QR Code en cours de génération...</span>
                </div>
              )}
            </div>
            <div className="text-center space-y-2">
              <p className="text-sm text-slate-400">
                Scannez ce QR code avec WhatsApp pour connecter votre compte
              </p>
              <div className="flex items-center justify-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm">Session prête à être connectée</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => setShowQRModal(false)} 
                variant="outline" 
                className="flex-1 border-slate-600 text-white hover:bg-slate-700"
              >
                Fermer
              </Button>
              <Button 
                onClick={() => handleGetQR(selectedSession)} 
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                Actualiser QR
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WAHANativeDashboard;