import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { QrCode, Monitor, RefreshCw, ExternalLink, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useWAHADashboard } from '@/hooks/useWAHADashboard';
import CompleteSessionManager from './CompleteSessionManager';

interface WhatsAppQRDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionName: string;
  onQRScanned?: () => void;
}

const WhatsAppQRDialog: React.FC<WhatsAppQRDialogProps> = ({
  open,
  onOpenChange,
  sessionName,
  onQRScanned
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('native');
  const [qrCode, setQrCode] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Utilisation du hook natif WAHA
  const { 
    getQRCode, 
    startSession, 
    sessions, 
    loading: wahaLoading 
  } = useWAHADashboard();

  // URL pour ouvrir le dashboard externe si besoin
  const externalDashboardUrl = `https://waha.bot.bj/dashboard`;

  // Fonction native pour récupérer le QR code
  const fetchNativeQR = async () => {
    if (!sessionName) return;
    
    setLoading(true);
    try {
      console.log('🔄 Utilisation de l\'interface native WAHA...');
      console.log('✅ API key WAHA configurée - utilisation de l\'interface native');
      
      // Étape 1: Démarrer la session
      console.log('▶️ Démarrage de la session:', sessionName);
      try {
        await startSession(sessionName);
        setSessionStarted(true);
        console.log('✅ Session démarrée avec succès');
      } catch (startError) {
        console.warn('⚠️ Session déjà démarrée ou erreur:', startError);
      }

      // Attendre un peu pour que WAHA génère le QR
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Étape 2: Récupérer le QR code avec l'interface native
      console.log('📱 Récupération du QR code avec l\'interface native...');
      const qrResult = await getQRCode(sessionName);
      
      if (qrResult?.qr) {
        setQrCode(qrResult.qr);
        console.log('✅ QR code récupéré avec l\'interface native!');
        toast.success('✅ QR Code généré avec succès!');
        onQRScanned?.();
      } else {
        throw new Error('QR code non disponible');
      }
    } catch (error) {
      console.error('❌ Erreur récupération QR native:', error);
      
      // Message d'erreur pour l'utilisateur
      toast.error(`❌ Erreur: ${error.message}`);
      
      // Retry logic
      if (retryCount < 2) {
        console.log(`🔄 Nouvelle tentative (${retryCount + 1}/3) dans 3 secondes...`);
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          fetchNativeQR();
        }, 3000);
      } else {
        toast.error('❌ Échec après 3 tentatives. Utilisez le dashboard complet.', {
          duration: 8000
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch QR when dialog opens and QR tab is active
  useEffect(() => {
    if (open && sessionName && activeTab === 'qr') {
      setRetryCount(0);
      setSessionStarted(false);
      setQrCode('');
      
      // Fetch QR après un délai pour s'assurer que l'UI est prête
      setTimeout(() => {
        fetchNativeQR();
      }, 500);
    }
  }, [open, sessionName, activeTab]);

  const handleRetryQR = () => {
    setRetryCount(0);
    fetchNativeQR();
  };

  const openExternalDashboard = () => {
    window.open(externalDashboardUrl, '_blank', 'width=1200,height=800');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <QrCode className="h-6 w-6 text-primary" />
            Interface WAHA Native - {sessionName}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="native" className="gap-2">
              <Monitor className="h-4 w-4" />
              Dashboard Natif
            </TabsTrigger>
            <TabsTrigger value="qr" className="gap-2">
              <QrCode className="h-4 w-4" />
              QR Rapide
            </TabsTrigger>
          </TabsList>

          <TabsContent value="native" className="space-y-4">
            <div className="h-[600px] overflow-auto">
              <Alert className="mb-4">
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  <strong>Interface native WAHA activée!</strong> Gérez vos sessions WhatsApp directement depuis cette interface intégrée.
                </AlertDescription>
              </Alert>
              <CompleteSessionManager />
            </div>
          </TabsContent>

          <TabsContent value="qr" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  QR Code Rapide - {sessionName}
                  {sessionStarted && (
                    <Badge variant="secondary" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Session Active
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Alert className="flex-1 mr-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Scannez ce QR code avec votre téléphone WhatsApp pour connecter la session.
                    </AlertDescription>
                  </Alert>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleRetryQR}
                      disabled={loading || wahaLoading}
                      className="gap-2"
                    >
                      {loading || wahaLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      Actualiser QR
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={openExternalDashboard}
                      className="gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Dashboard Externe
                    </Button>
                  </div>
                </div>

                <div className="flex justify-center">
                  <div className="relative">
                    {loading || wahaLoading ? (
                      <div className="w-64 h-64 border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center">
                        <div className="flex flex-col items-center gap-3">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                          <p className="text-sm text-muted-foreground">
                            Génération du QR...
                            {retryCount > 0 && ` (Tentative ${retryCount + 1}/3)`}
                          </p>
                        </div>
                      </div>
                    ) : qrCode ? (
                      <div className="p-4 bg-white rounded-lg border-2 border-primary/20 shadow-lg">
                        <img 
                          src={qrCode} 
                          alt="QR Code WhatsApp" 
                          className="w-64 h-64 object-contain"
                        />
                      </div>
                    ) : (
                      <div className="w-64 h-64 border-2 border-dashed border-muted/30 rounded-lg flex items-center justify-center">
                        <div className="flex flex-col items-center gap-3 text-center p-4">
                          <AlertCircle className="h-8 w-8 text-muted-foreground" />
                          <div className="space-y-2">
                            <p className="text-sm font-medium">
                              QR Code en attente
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Cliquez sur "Actualiser QR" pour générer le code
                            </p>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleRetryQR}
                            className="gap-2"
                          >
                            <RefreshCw className="h-4 w-4" />
                            Générer QR
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {qrCode && (
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>
                      <strong>QR Code généré!</strong> Ouvrez WhatsApp sur votre téléphone, allez dans Appareils connectés {">"} Connecter un appareil, et scannez ce code.
                    </AlertDescription>
                  </Alert>
                )}

                {sessionStarted && (
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>
                      Session "{sessionName}" active et prête à recevoir des connexions WhatsApp.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="ghost" onClick={() => setActiveTab('native')}>
            Interface Complète
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WhatsAppQRDialog;