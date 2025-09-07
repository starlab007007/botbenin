import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { 
  QrCode, 
  Monitor, 
  RefreshCw, 
  ExternalLink, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  MousePointer,
  Download,
  Copy,
  Info
} from 'lucide-react';

interface WhatsAppQRModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionName: string;
  onQRScanned?: () => void;
}

const WhatsAppQRModal: React.FC<WhatsAppQRModalProps> = ({
  open,
  onOpenChange,
  sessionName,
  onQRScanned
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wahaReady, setWahaReady] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loginClicked, setLoginClicked] = useState(false);
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false);

  // URL du proxy WAHA
  const proxyUrl = `https://mvynepqulhflxtyymtzs.functions.supabase.co/waha-proxy?path=/dashboard`;

  // Réinitialiser l'état quand la modale s'ouvre/ferme
  useEffect(() => {
    if (open) {
      setIsLoading(true);
      setError(null);
      setWahaReady(false);
      setQrCode(null);
      setLoginClicked(false);
      setAutoLoginAttempted(false);
    }
  }, [open, sessionName]);

  // Écouter les messages de l'iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Sécurité: vérifier l'origine
      if (!event.origin.includes('supabase.co')) {
        return;
      }

      console.log('📨 Message reçu de l\'iframe:', event.data);

      switch (event.data.type) {
        case 'waha-ready':
          console.log('✅ WAHA dashboard prêt');
          setWahaReady(true);
          setIsLoading(false);
          
          // Démarrer l'automatisation après un délai
          if (!autoLoginAttempted) {
            setTimeout(() => {
              triggerAutoLogin();
            }, 2000);
          }
          break;

        case 'qr-found':
          console.log('📱 QR Code détecté!');
          setQrCode(event.data.qrCode);
          toast.success('QR Code détecté! Scannez-le avec WhatsApp.');
          onQRScanned?.();
          break;

        default:
          console.log('📨 Message non géré:', event.data.type);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [autoLoginAttempted, onQRScanned]);

  // Fonction pour déclencher l'auto-login
  const triggerAutoLogin = () => {
    if (!iframeRef.current || autoLoginAttempted) return;

    console.log('🚀 Déclenchement auto-login pour:', sessionName);
    setAutoLoginAttempted(true);

    try {
      iframeRef.current.contentWindow?.postMessage({
        type: 'auto-login',
        sessionName: sessionName,
        username: 'admin', // Ces valeurs seront récupérées côté serveur
        password: 'Starlab@007'
      }, '*');

      setTimeout(() => {
        setLoginClicked(true);
      }, 3000);

    } catch (error) {
      console.error('❌ Erreur auto-login:', error);
      setError('Erreur lors de l\'automatisation');
    }
  };

  // Fonction pour déclencher manuellement le login de session
  const triggerSessionLogin = () => {
    if (!iframeRef.current) return;

    console.log('👆 Déclenchement manuel du login pour:', sessionName);

    try {
      iframeRef.current.contentWindow?.postMessage({
        type: 'start-session-login',
        sessionName: sessionName
      }, '*');

      setLoginClicked(true);
      toast.info('Tentative de clic automatique sur le bouton login...');
    } catch (error) {
      console.error('❌ Erreur login manuel:', error);
    }
  };

  const handleIframeLoad = () => {
    console.log('🌐 Iframe chargé');
    // L'état sera mis à jour par le message 'waha-ready'
  };

  const handleIframeError = () => {
    console.error('❌ Erreur chargement iframe');
    setError('Erreur de chargement du dashboard WAHA');
    setIsLoading(false);
  };

  const refreshIframe = () => {
    setIsLoading(true);
    setError(null);
    setWahaReady(false);
    setQrCode(null);
    setLoginClicked(false);
    setAutoLoginAttempted(false);
    
    if (iframeRef.current) {
      iframeRef.current.src = proxyUrl + '&nocache=' + Date.now();
    }
  };

  const openExternalDashboard = () => {
    window.open('https://waha.bot.bj/dashboard', '_blank');
    toast.info('Dashboard externe ouvert. Identifiants: admin / Starlab@007');
  };

  const copyQRCode = async () => {
    if (!qrCode) return;
    
    try {
      await navigator.clipboard.writeText(qrCode);
      toast.success('QR code copié dans le presse-papiers');
    } catch (error) {
      toast.error('Erreur lors de la copie');
    }
  };

  const downloadQRCode = () => {
    if (!qrCode) return;
    
    try {
      const link = document.createElement('a');
      link.href = qrCode;
      link.download = `whatsapp-qr-${sessionName}-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('QR code téléchargé');
    } catch (error) {
      toast.error('Erreur lors du téléchargement');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <QrCode className="h-6 w-6 text-primary" />
            Scanner QR Code WhatsApp - {sessionName}
            {qrCode && (
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                QR Détecté
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Instructions pour l'utilisateur */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Instructions :</p>
                {!wahaReady ? (
                  <p>⏳ Chargement du dashboard WAHA...</p>
                ) : !autoLoginAttempted ? (
                  <p>🔐 Connexion automatique en cours...</p>
                ) : !loginClicked ? (
                  <div>
                    <p>👆 <strong>Cliquez sur le bouton "Login" de votre session "{sessionName}"</strong> dans le dashboard ci-dessous.</p>
                    <Button 
                      onClick={triggerSessionLogin}
                      size="sm" 
                      variant="outline" 
                      className="mt-2 gap-2"
                    >
                      <MousePointer className="h-4 w-4" />
                      Clic automatique sur Login
                    </Button>
                  </div>
                ) : !qrCode ? (
                  <p>📱 Recherche du QR code... Patientez quelques secondes.</p>
                ) : (
                  <p>✅ <strong>QR Code prêt!</strong> Scannez-le avec votre application WhatsApp.</p>
                )}
              </div>
            </AlertDescription>
          </Alert>

          {/* Dashboard WAHA intégré */}
          <div className="relative border rounded-lg overflow-hidden bg-muted/5" style={{ height: '500px' }}>
            {isLoading && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
                <div className="text-center space-y-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm font-medium">Connexion au dashboard WAHA...</p>
                  <p className="text-xs text-muted-foreground">
                    Proxy sécurisé via Supabase
                  </p>
                </div>
              </div>
            )}

            {error ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-4">
                  <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
                  <div>
                    <h3 className="font-semibold text-destructive">Erreur de connexion</h3>
                    <p className="text-sm text-muted-foreground mt-1">{error}</p>
                  </div>
                  <div className="flex gap-2 justify-center">
                    <Button onClick={refreshIframe} variant="outline" size="sm">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Réessayer
                    </Button>
                    <Button onClick={openExternalDashboard} variant="default" size="sm">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Dashboard Externe
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <iframe
                ref={iframeRef}
                src={proxyUrl}
                className="w-full h-full border-0"
                title="Dashboard WAHA"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation"
                onLoad={handleIframeLoad}
                onError={handleIframeError}
                loading="eager"
              />
            )}
          </div>

          {/* QR Code extrait (si disponible) */}
          {qrCode && (
            <div className="border rounded-lg p-4 bg-background">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium flex items-center gap-2">
                  <QrCode className="h-4 w-4" />
                  QR Code WhatsApp - {sessionName}
                </h4>
                <div className="flex gap-2">
                  <Button onClick={copyQRCode} variant="outline" size="sm">
                    <Copy className="h-4 w-4 mr-2" />
                    Copier
                  </Button>
                  <Button onClick={downloadQRCode} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Télécharger
                  </Button>
                </div>
              </div>
              <div className="flex justify-center">
                <div className="bg-white p-4 rounded-lg border-2 border-primary/20 shadow-lg">
                  <img 
                    src={qrCode} 
                    alt={`QR Code WhatsApp - ${sessionName}`}
                    className="w-64 h-64 object-contain"
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground text-center mt-3">
                Scannez ce QR code avec votre application WhatsApp pour connecter la session.
              </p>
            </div>
          )}
        </div>

        {/* Actions de la modale */}
        <div className="flex justify-between pt-4 border-t">
          <div className="flex gap-2">
            <Button onClick={refreshIframe} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualiser
            </Button>
            <Button onClick={openExternalDashboard} variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              Dashboard Externe
            </Button>
          </div>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WhatsAppQRModal;