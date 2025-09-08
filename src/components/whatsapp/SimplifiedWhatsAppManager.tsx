import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useWhatsAppAccounts } from '@/hooks/useWhatsAppAccounts';
import { useAuth } from '@/contexts/AuthContext';
import AutoWAHAAuth from './AutoWAHAAuth';
import BotWebhookLinker from './BotWebhookLinker';
import { 
  MessageCircle,
  Smartphone,
  QrCode,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Shield,
  Bot,
  Link2
} from 'lucide-react';

const SimplifiedWhatsAppManager: React.FC = () => {
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedSessionName, setSelectedSessionName] = useState<string>('');
  const [qrCode, setQrCode] = useState<string>('');
  const [qrRefreshing, setQrRefreshing] = useState(false);
  const [showAuth, setShowAuth] = useState(true);
  const [authCompleted, setAuthCompleted] = useState(false);
  const [showBotLinker, setShowBotLinker] = useState(false);
  const [selectedSessionForBot, setSelectedSessionForBot] = useState('');

  const { toast } = useToast();
  const { user } = useAuth();
  
  const { 
    accounts, 
    bots,
    loading: accountsLoading,
    createSession,
    startSession, 
    getQRCode, 
    linkBot
  } = useWhatsAppAccounts();

  // User-specific session management
  const userSessions = accounts.filter(account => 
    account.session_name.includes(user?.id?.substring(0, 8) || '')
  );

  const handleCreateAndConnectSession = async () => {
    if (!user) return;

    const sessionName = `user_${user.id.substring(0, 8)}_${Date.now()}`;
    
    try {
      // Create session
      await createSession(sessionName);
      
      // Start session
      await startSession(sessionName);
      
      // Show QR modal
      setSelectedSessionName(sessionName);
      setShowQRModal(true);
      
      // Get QR code
      await refreshQRCode(sessionName);
      
      toast({
        title: "Session créée",
        description: "Votre session WhatsApp est prête. Scannez le QR code.",
      });
    } catch (error) {
      console.error('Failed to create session:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la session WhatsApp",
        variant: "destructive",
      });
    }
  };

  const refreshQRCode = async (sessionName: string) => {
    setQrRefreshing(true);
    
    try {
      const qrCodeData = await getQRCode(sessionName);
      if (qrCodeData) {
        setQrCode(qrCodeData);
      }
    } catch (error) {
      console.error('QR code generation failed:', error);
      toast({
        title: "Erreur QR Code",
        description: "Impossible de générer le QR code",
        variant: "destructive",
      });
    } finally {
      setQrRefreshing(false);
    }
  };

  const handleLinkBot = async (accountId: string) => {
    if (bots.length === 0) {
      toast({
        title: "Aucun bot disponible",
        description: "Créez d'abord un bot dans la section Bot Management",
        variant: "destructive",
      });
      return;
    }

    try {
      await linkBot(accountId, bots[0].id, 'Bonjour! Je suis votre assistant IA WhatsApp.');
      toast({
        title: "Bot connecté",
        description: "Votre bot est maintenant actif sur WhatsApp",
      });
    } catch (error) {
      console.error('Failed to link bot:', error);
    }
  };

  const handleAuthComplete = () => {
    setAuthCompleted(true);
    setShowAuth(false);
  };

  // Show auth screen first
  if (showAuth && !authCompleted) {
    return <AutoWAHAAuth onAuthComplete={handleAuthComplete} />;
  }

  if (accountsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Chargement de vos sessions...</p>
        </div>
      </div>
    );
  }

  const connectedSessions = userSessions.filter(s => s.status === 'connected');
  const disconnectedSessions = userSessions.filter(s => s.status !== 'connected');

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold flex items-center justify-center gap-2 mb-2">
          <MessageCircle className="w-8 h-8 text-green-500" />
          Mes Sessions WhatsApp
        </h2>
        <p className="text-muted-foreground">
          Gérez vos connexions WhatsApp personnelles avec authentification automatique
        </p>
      </div>

      {/* Auth Status Indicator */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-medium text-green-800">Authentification WAHA Active</p>
              <p className="text-sm text-green-600">Connecté automatiquement à https://waha.bot.bj</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <Smartphone className="w-8 h-8 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold">{connectedSessions.length}</p>
            <p className="text-sm text-muted-foreground">Sessions Connectées</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Bot className="w-8 h-8 mx-auto mb-2 text-blue-500" />
            <p className="text-2xl font-bold">{bots.length}</p>
            <p className="text-sm text-muted-foreground">Bots Disponibles</p>
          </CardContent>
        </Card>
      </div>

      {/* Connected Sessions */}
      {connectedSessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              Sessions WhatsApp Actives
            </CardTitle>
            <CardDescription>Vos connexions WhatsApp opérationnelles</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {connectedSessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-4 border rounded-lg bg-green-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <div>
                    <h4 className="font-medium">{session.session_name}</h4>
                    <p className="text-sm text-green-600">
                      {session.phone_number || 'Numéro disponible après connexion'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-500">Connecté</Badge>
                  <Button 
                    size="sm"
                    onClick={() => {
                      setSelectedSessionForBot(session.session_name);
                      setShowBotLinker(true);
                    }}
                    className="bg-blue-500 hover:bg-blue-600"
                  >
                    <Link2 className="w-3 h-3 mr-1" />
                    Lier Bot
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Disconnected Sessions */}
      {disconnectedSessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="w-5 h-5" />
              Sessions à Activer
            </CardTitle>
            <CardDescription>Scannez le QR code pour connecter</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {disconnectedSessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                  <div>
                    <h4 className="font-medium">{session.session_name}</h4>
                    <p className="text-sm text-muted-foreground">En attente de connexion</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm"
                    onClick={() => {
                      setSelectedSessionName(session.session_name);
                      setShowQRModal(true);
                      refreshQRCode(session.session_name);
                    }}
                    className="bg-blue-500 hover:bg-blue-600"
                  >
                    <QrCode className="w-3 h-3 mr-1" />
                    Scanner QR
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => {
                      setSelectedSessionForBot(session.session_name);
                      setShowBotLinker(true);
                    }}
                    variant="outline"
                    className="border-green-200 text-green-600 hover:bg-green-50"
                  >
                    <Link2 className="w-3 h-3 mr-1" />
                    Lier Bot
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Create New Session */}
      {userSessions.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <MessageCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Créer votre première session WhatsApp</h3>
            <p className="text-muted-foreground mb-6">
              Connectez votre compte WhatsApp pour commencer à utiliser vos bots IA
            </p>
            <Button onClick={handleCreateAndConnectSession} size="lg">
              <Smartphone className="w-4 h-4 mr-2" />
              Créer une Session WhatsApp
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add Session Button */}
      {userSessions.length > 0 && (
        <div className="text-center">
          <Button onClick={handleCreateAndConnectSession} variant="outline">
            <Smartphone className="w-4 h-4 mr-2" />
            Ajouter une Nouvelle Session
          </Button>
        </div>
      )}

      {/* QR Code Modal */}
      <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connecter WhatsApp</DialogTitle>
            <DialogDescription>
              Ouvrez WhatsApp sur votre téléphone et scannez ce code QR
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4">
            {qrRefreshing ? (
              <div className="flex items-center justify-center w-64 h-64 border-2 border-dashed rounded-lg">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : qrCode ? (
              <div className="p-4 bg-white rounded-lg border">
                <img src={qrCode} alt="QR Code WhatsApp" className="w-64 h-64" />
              </div>
            ) : (
              <div className="flex items-center justify-center w-64 h-64 border-2 border-dashed rounded-lg">
                <p className="text-sm text-muted-foreground">Génération du QR code...</p>
              </div>
            )}
            
            <Button 
              onClick={() => refreshQRCode(selectedSessionName)}
              disabled={qrRefreshing}
              className="w-full"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${qrRefreshing ? 'animate-spin' : ''}`} />
              Actualiser le QR Code
            </Button>
            
            <p className="text-xs text-center text-muted-foreground">
              Le QR code se renouvelle automatiquement. 
              Une fois scanné, la connexion sera établie automatiquement.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <BotWebhookLinker
        open={showBotLinker}
        onOpenChange={setShowBotLinker}
        sessionName={selectedSessionForBot}
        onWebhookAdded={() => {
          toast({
            title: "Bot lié avec succès",
            description: "Le webhook du bot a été ajouté à la session WhatsApp",
          });
          setShowBotLinker(false);
        }}
      />
    </div>
  );
};

export default SimplifiedWhatsAppManager;