import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useWhatsAppAccounts } from '@/hooks/useWhatsAppAccounts';
import { useWhatsAppAutoProvisioning } from '@/hooks/useWhatsAppAutoProvisioning';
import { useWhatsAppMessages } from '@/hooks/useWhatsAppMessages';
import WAHAHealthCheck from './WAHAHealthCheck';
import { 
  MessageCircle,
  Smartphone,
  Bot,
  QrCode,
  Play,
  Square,
  Trash2,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Monitor,
  ExternalLink,
  Users,
  MessageSquare,
  Settings,
  Zap,
  Activity
} from 'lucide-react';

const WhatsAppDashboard: React.FC = () => {
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedAccountForQR, setSelectedAccountForQR] = useState<string>('');
  const [qrCode, setQrCode] = useState<string>('');
  const [qrRefreshing, setQrRefreshing] = useState(false);

  const { toast } = useToast();
  
  const { 
    accounts, 
    bots, 
    botLinks, 
    loading: accountsLoading,
    loadData,
    startSession, 
    getQRCode, 
    stopSession, 
    deleteSession,
    linkBot,
    unlinkBot
  } = useWhatsAppAccounts();

  const {
    isProvisioning,
    isProvisioned,
    autoProvision,
  } = useWhatsAppAutoProvisioning();

  // Get messages for connected accounts
  const connectedAccountId = accounts.find(a => a.status === 'connected')?.id;
  const { messages, contacts } = useWhatsAppMessages();

  const handleConnectWhatsApp = async (accountId: string, sessionName: string) => {
    try {
      await startSession(sessionName);
      setSelectedAccountForQR(accountId);
      setShowQRModal(true);
      
      // Get QR code with retry
      await refreshQRCode(sessionName);
    } catch (error) {
      console.error('Failed to start session:', error);
    }
  };

  const refreshQRCode = async (sessionName: string) => {
    setQrRefreshing(true);
    let retryCount = 0;
    const maxRetries = 5;
    
    const tryGetQR = async (): Promise<void> => {
      try {
        const qrCodeData = await getQRCode(sessionName);
        if (qrCodeData) {
          setQrCode(qrCodeData);
          setQrRefreshing(false);
          return;
        }
      } catch (error) {
        console.error(`QR code attempt ${retryCount + 1} failed:`, error);
      }
      
      retryCount++;
      if (retryCount < maxRetries) {
        setTimeout(tryGetQR, 2000);
      } else {
        setQrRefreshing(false);
        toast({
          title: "Erreur QR Code",
          description: "Impossible de générer le QR code. Essayez de redémarrer la session.",
          variant: "destructive",
        });
      }
    };
    
    setTimeout(tryGetQR, 1000);
  };

  const handleLinkBot = async (accountId: string, botId: string) => {
    try {
      await linkBot(accountId, botId, 'Bonjour! Je suis votre assistant IA. Comment puis-je vous aider?');
      toast({
        title: "Bot lié",
        description: "Le bot a été lié avec succès",
      });
    } catch (error) {
      console.error('Failed to link bot:', error);
    }
  };

  // Auto-provision on first load if needed
  useEffect(() => {
    if (!accountsLoading && !isProvisioned && !isProvisioning) {
      autoProvision();
    }
  }, [accountsLoading, isProvisioned, isProvisioning]);

  if (accountsLoading || isProvisioning) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">
            {isProvisioning ? 'Configuration de WhatsApp...' : 'Chargement...'}
          </p>
        </div>
      </div>
    );
  }

  const connectedAccounts = accounts.filter(a => a.status === 'connected');
  const disconnectedAccounts = accounts.filter(a => a.status !== 'connected');
  const activeLinks = botLinks.filter(bl => bl.is_active);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-green-50 via-blue-50 to-purple-50 dark:from-green-950/20 dark:via-blue-950/20 dark:to-purple-950/20 rounded-2xl p-8 mb-8">
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h2 className="text-4xl font-display font-bold flex items-center gap-3 text-foreground mb-3">
              <div className="relative">
                <MessageCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
              </div>
              Mon Dashboard WhatsApp
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Tableau de bord principal pour gérer vos sessions WhatsApp et automatisations IA
            </p>
          </div>
          
          {/* Admin Access Button (only visible to admins) */}
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.open('https://waha.bot.bj', '_blank')}
              className="flex items-center gap-2 bg-white/80 dark:bg-black/20 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-all duration-300"
            >
              <ExternalLink className="w-4 h-4" />
              WAHA Admin
            </Button>
            <div className="flex items-center gap-2 bg-white/80 dark:bg-black/20 backdrop-blur-sm rounded-full px-4 py-2 shadow-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-foreground">Système actif</span>
            </div>
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 via-blue-500/5 to-purple-500/5 animate-pulse-glow"></div>
      </div>

      {/* Diagnostic WAHA */}
      <WAHAHealthCheck />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 border-green-200 dark:border-green-800 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg">
                  <Smartphone className="w-7 h-7 text-white" />
                </div>
                {connectedAccounts.length > 0 && (
                  <div className="absolute -top-2 -right-2 w-5 h-5 bg-green-400 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-white">{connectedAccounts.length}</span>
                  </div>
                )}
              </div>
              <div>
                <p className="text-3xl font-bold text-green-800 dark:text-green-200">{connectedAccounts.length}</p>
                <p className="text-sm font-medium text-green-700 dark:text-green-300">Sessions connectées</p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">En ligne maintenant</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 border-blue-200 dark:border-blue-800 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg">
                  <Bot className="w-7 h-7 text-white" />
                </div>
                {activeLinks.length > 0 && (
                  <div className="absolute -top-2 -right-2 w-5 h-5 bg-blue-400 rounded-full animate-pulse"></div>
                )}
              </div>
              <div>
                <p className="text-3xl font-bold text-blue-800 dark:text-blue-200">{activeLinks.length}</p>
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Bots actifs</p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">IA opérationnelle</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20 border-purple-200 dark:border-purple-800 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg">
                <MessageSquare className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-purple-800 dark:text-purple-200">{messages.length}</p>
                <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Messages récents</p>
                <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">Activité du jour</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20 border-orange-200 dark:border-orange-800 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg">
                <Users className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-orange-800 dark:text-orange-200">{contacts.length}</p>
                <p className="text-sm font-medium text-orange-700 dark:text-orange-300">Contacts actifs</p>
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">Base de données</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Connected Sessions */}
      {connectedAccounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Sessions WhatsApp Connectées
            </CardTitle>
            <CardDescription>
              Sessions WhatsApp actives et opérationnelles
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {connectedAccounts.map((account) => {
              const linkedBot = activeLinks.find(link => link.whatsapp_account_id === account.id);
              const availableBots = bots.filter(bot => 
                !activeLinks.some(link => link.bot_id === bot.id && link.whatsapp_account_id === account.id)
              );

              return (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-green-50/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <div>
                      <h4 className="font-medium">{account.session_name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {account.phone_number || 'Numéro non disponible'}
                      </p>
                      {linkedBot && (
                        <p className="text-xs text-green-600 flex items-center gap-1">
                          <Bot className="w-3 h-3" />
                          Bot: {linkedBot.bots.name}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-500">Connecté</Badge>
                    
                    {!linkedBot && availableBots.length > 0 && (
                      <Button 
                        size="sm"
                        onClick={() => handleLinkBot(account.id, availableBots[0].id)}
                        className="bg-blue-500 hover:bg-blue-600"
                      >
                        <Bot className="w-3 h-3 mr-1" />
                        Lier Bot
                      </Button>
                    )}
                    
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        try {
                          await stopSession(account.session_name);
                        } catch (error) {
                          console.error('Error stopping session:', error);
                        }
                      }}
                    >
                      <Square className="w-3 h-3 mr-1" />
                      Arrêter
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Disconnected Sessions */}
      {disconnectedAccounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Sessions à Connecter
            </CardTitle>
            <CardDescription>
              Sessions WhatsApp créées mais non connectées
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {disconnectedAccounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                  <div>
                    <h4 className="font-medium">{account.session_name}</h4>
                    <p className="text-sm text-muted-foreground">Non connecté</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Déconnecté</Badge>
                  <Button 
                    size="sm"
                    onClick={() => handleConnectWhatsApp(account.id, account.session_name)}
                    className="bg-blue-500 hover:bg-blue-600"
                  >
                    <QrCode className="w-3 h-3 mr-1" />
                    Connecter
                  </Button>
                  <Button 
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      if (confirm('Êtes-vous sûr de vouloir supprimer cette session?')) {
                        try {
                          await deleteSession(account.session_name);
                        } catch (error) {
                          console.error('Error deleting session:', error);
                        }
                      }
                    }}
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Supprimer
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recent Messages */}
      {connectedAccounts.length > 0 && messages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="w-5 h-5" />
              Messages Récents
            </CardTitle>
            <CardDescription>
              Activité récente sur vos sessions WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {messages.slice(0, 10).map((message, index) => (
                <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    message.direction === 'outgoing' ? 'bg-blue-500' : 'bg-green-500'
                  }`}></div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">
                        {message.direction === 'outgoing' ? 'Bot' : message.from?.replace('@c.us', '') || 'Contact'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(message.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {message.message || 'Message multimédia'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* QR Code Modal */}
      <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Scanner le Code QR</DialogTitle>
            <DialogDescription>
              Utilisez WhatsApp sur votre téléphone pour scanner ce code QR
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4">
            {qrRefreshing ? (
              <div className="flex items-center justify-center w-64 h-64 border border-dashed rounded-lg">
                <RefreshCw className="w-8 h-8 animate-spin" />
              </div>
            ) : qrCode ? (
              <div className="p-4 bg-white rounded-lg">
                <img src={qrCode} alt="QR Code" className="w-64 h-64" />
              </div>
            ) : (
              <div className="flex items-center justify-center w-64 h-64 border border-dashed rounded-lg">
                <p className="text-sm text-muted-foreground">Génération du QR code...</p>
              </div>
            )}
            
            <Button 
              onClick={() => {
                const account = accounts.find(a => a.id === selectedAccountForQR);
                if (account) {
                  refreshQRCode(account.session_name);
                }
              }}
              disabled={qrRefreshing}
              className="w-full"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${qrRefreshing ? 'animate-spin' : ''}`} />
              Actualiser le QR Code
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Empty State */}
      {accounts.length === 0 && !isProvisioning && (
        <Card>
          <CardContent className="p-8 text-center">
            <MessageCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Aucune session WhatsApp</h3>
            <p className="text-muted-foreground mb-4">
              La configuration automatique n'a pas pu créer de session. Contactez le support.
            </p>
            <Button onClick={autoProvision} disabled={isProvisioning}>
              <Zap className="w-4 h-4 mr-2" />
              Réessayer la configuration
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default WhatsAppDashboard;