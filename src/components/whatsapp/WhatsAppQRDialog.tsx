import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { QrCode, Monitor, RefreshCw, ExternalLink, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import WAHADashboardIframe from './WAHADashboardIframe';

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
  const [activeTab, setActiveTab] = useState('dashboard');
  const [qrCode, setQrCode] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // URL pour le dashboard intégré avec paramètre autoQr
  const dashboardUrl = `/functions/v1/waha-dashboard-mirror?path=dashboard&autoQr=${encodeURIComponent(sessionName)}`;
  
  // URL pour ouvrir le dashboard externe
  const externalDashboardUrl = `https://waha.bot.bj/dashboard`;

  // Solution de contournement via dashboard proxy
  const fetchDirectQR = async () => {
    if (!sessionName) return;
    
    setLoading(true);
    try {
      console.log('🔄 SOLUTION DE CONTOURNEMENT: Utilisation du dashboard proxy pour le QR...');
      console.log('🔍 Diagnostic: API key WAHA manque de permissions d\'écriture (401 Unauthorized)');
      
      // Étape 1: Essayer via dashboard proxy pour démarrer la session
      console.log('▶️ Tentative de démarrage via dashboard proxy...');
      try {
        const proxyStartUrl = `/functions/v1/waha-dashboard-proxy?endpoint=api/sessions/${sessionName}/start`;
        const startResponse = await fetch(proxyStartUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (startResponse.ok) {
          console.log('✅ Session démarrée via proxy');
          setSessionStarted(true);
        } else {
          console.warn('⚠️ Démarrage proxy non optimal:', await startResponse.text());
        }
      } catch (proxyError) {
        console.warn('⚠️ Erreur proxy start:', proxyError);
      }

      // Attendre avant QR
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Étape 2: Récupérer QR via proxy
      console.log('📱 Récupération QR via dashboard proxy...');
      
      const qrEndpoints = [
        `api/sessions/${sessionName}/auth/qr`,
        `api/v2/sessions/${sessionName}/auth/qr`,
        `api/${sessionName}/auth/qr?format=base64`,
        `api/v2/${sessionName}/auth/qr?format=base64`
      ];

      let qrSuccess = false;
      for (const endpoint of qrEndpoints) {
        try {
          console.log(`🎯 Tentative QR endpoint: ${endpoint}`);
          const qrUrl = `/functions/v1/waha-dashboard-proxy?endpoint=${endpoint}`;
          const qrResponse = await fetch(qrUrl, {
            headers: {
              'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
              'Accept': 'application/json,image/*'
            }
          });

          if (qrResponse.ok) {
            const contentType = qrResponse.headers.get('content-type') || '';
            
            if (contentType.includes('image/')) {
              // QR code as image
              const blob = await qrResponse.blob();
              const qrDataUrl = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
              });
              setQrCode(qrDataUrl);
              qrSuccess = true;
              break;
            } else {
              // QR code as JSON
              const qrData = await qrResponse.json();
              if (qrData.qr || qrData.qrCode) {
                setQrCode(qrData.qr || qrData.qrCode);
                qrSuccess = true;
                break;
              }
            }
          }
        } catch (endpointError) {
          console.warn(`❌ Endpoint ${endpoint} failed:`, endpointError);
        }
      }

      if (qrSuccess) {
        console.log('✅ QR code récupéré via proxy!');
        toast.success('QR Code généré via dashboard proxy!');
      } else {
        // Fallback: Essayer l'ancienne méthode une dernière fois
        console.log('🔄 Fallback: Tentative avec l\'ancienne méthode...');
        const qrResponse = await supabase.functions.invoke('waha-session-manager', {
          body: { action: 'qr', sessionName }
        });

        if (qrResponse.data?.success && qrResponse.data?.qrCode) {
          setQrCode(qrResponse.data.qrCode);
          toast.success('QR Code généré!');
        } else {
          throw new Error(`PROBLÈME: API key WAHA manque de permissions d'écriture. Erreur: ${qrResponse.data?.error || 'QR non disponible'}`);
        }
      }
    } catch (error) {
      console.error('❌ Toutes les méthodes ont échoué:', error);
      
      // Message d'erreur détaillé pour l'utilisateur
      toast.error(`❌ Erreur: ${error.message}\n\n🔧 Solution: Mettre à jour l'API key WAHA avec permissions complètes dans Supabase Secrets`);
      
      // Retry logic avec diagnostic
      if (retryCount < 2) {
        console.log(`🔄 Nouvelle tentative diagnostic (${retryCount + 1}/3) dans 5 secondes...`);
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          fetchDirectQR();
        }, 5000);
      } else {
        toast.error('❌ Échec après 3 tentatives. L\'API key WAHA doit être mise à jour avec des permissions complètes.', {
          duration: 10000
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch QR when dialog opens
  useEffect(() => {
    if (open && sessionName) {
      setRetryCount(0);
      setSessionStarted(false);
      setQrCode('');
      
      // Fetch QR after a short delay to ensure UI is ready
      setTimeout(() => {
        fetchDirectQR();
      }, 1000);
    }
  }, [open, sessionName]);

  const handleDashboardLoad = () => {
    setDashboardLoading(false);
    console.log('📱 Dashboard intégré chargé');
  };

  const handleRetryQR = () => {
    setRetryCount(0);
    fetchDirectQR();
  };

  const openExternalDashboard = () => {
    window.open(externalDashboardUrl, '_blank', 'width=1200,height=800');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <QrCode className="h-6 w-6 text-primary" />
            Scanner QR Code WhatsApp - {sessionName}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dashboard" className="gap-2">
              <Monitor className="h-4 w-4" />
              Dashboard Intégré
            </TabsTrigger>
            <TabsTrigger value="direct" className="gap-2">
              <QrCode className="h-4 w-4" />
              QR Direct
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-4">
            <div className="h-[500px]">
              <WAHADashboardIframe />
            </div>
          </TabsContent>

          <TabsContent value="direct" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  QR Code Direct - {sessionName}
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
                  <Button
                    variant="outline"
                    onClick={handleRetryQR}
                    disabled={loading}
                    className="gap-2"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    Actualiser QR
                  </Button>
                </div>

                <div className="flex justify-center">
                  <div className="relative">
                    {loading ? (
                      <div className="w-64 h-64 border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center">
                        <div className="flex flex-col items-center gap-3">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                          <p className="text-sm text-muted-foreground">
                            Génération du QR...
                            {retryCount > 0 && ` (Tentative ${retryCount + 1}/4)`}
                          </p>
                        </div>
                      </div>
                    ) : qrCode ? (
                      <div className="p-4 bg-white rounded-lg border-2 border-primary/20">
                        <img 
                          src={qrCode} 
                          alt="QR Code WhatsApp" 
                          className="w-64 h-64 object-contain"
                        />
                      </div>
                    ) : (
                      <div className="w-64 h-64 border-2 border-dashed border-destructive/30 rounded-lg flex items-center justify-center">
                        <div className="flex flex-col items-center gap-3 text-center p-4">
                          <AlertCircle className="h-8 w-8 text-destructive" />
                          <div className="space-y-2">
                            <p className="text-sm text-destructive font-medium">
                              QR Code non disponible
                            </p>
                            <p className="text-xs text-muted-foreground">
                              API key WAHA manque de permissions d'écriture
                            </p>
                          </div>
                          <div className="flex flex-col gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={handleRetryQR}
                              className="gap-2"
                            >
                              <RefreshCw className="h-4 w-4" />
                              Réessayer avec Proxy
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={openExternalDashboard}
                              className="gap-2 text-xs"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Ouvrir Dashboard WAHA
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {qrCode && (
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>
                      QR Code généré! Ouvrez WhatsApp sur votre téléphone, allez dans Appareils connectés {">"} Connecter un appareil, et scannez ce code.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default WhatsAppQRDialog;