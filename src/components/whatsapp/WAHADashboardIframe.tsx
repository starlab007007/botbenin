import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Monitor, ExternalLink, AlertCircle, Loader2, RefreshCw, Shield, QrCode, Download, Copy } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

interface WAHADashboardIframeProps {
  sessionName?: string;
  onQRCodeExtracted?: (qrCode: string) => void;
  autoExtractQR?: boolean;
}

const WAHADashboardIframe: React.FC<WAHADashboardIframeProps> = ({ 
  sessionName, 
  onQRCodeExtracted, 
  autoExtractQR = false 
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cspBlocked, setCspBlocked] = useState(false);
  const [extractedQR, setExtractedQR] = useState<string | null>(null);
  const [qrExtractionStatus, setQRExtractionStatus] = useState<'idle' | 'extracting' | 'success' | 'error'>('idle');

  // URL du dashboard WAHA via la fonction mirror Supabase (Méthode 1)
  const dashboardUrl = 'https://mvynepqulhflxtyymtzs.functions.supabase.co/waha-dashboard-mirror?path=/dashboard';
  const credentials = { username: 'admin', password: 'Starlab@007' };

  // Fonction pour extraire le QR code depuis l'iframe
  const extractQRCode = async () => {
    if (!sessionName) {
      setError('Nom de session requis pour extraire le QR code');
      return;
    }

    if (qrExtractionStatus === 'extracting') {
      console.log('⚠️ Extraction déjà en cours, annulation');
      return;
    }

    setQRExtractionStatus('extracting');
    setError(null);

    try {
      console.log(`🔍 Extraction du QR code pour la session: ${sessionName}`);
      
      // Méthode directe: utiliser le proxy avec fallback simple
      await extractQRViaProxy();
      
    } catch (error) {
      console.error('❌ Erreur extraction QR:', error);
      setQRExtractionStatus('error');
      setError(`Erreur extraction QR: ${error.message}`);
    }
  };

  // Méthode simplifiée: extraire via proxy API seulement
  const extractQRViaProxy = async () => {
    try {
      console.log('🔄 Extraction QR via proxy API...');
      
      // Essayer d'abord de démarrer la session
      console.log('▶️ Démarrage de la session...');
      try {
        const startResponse = await fetch(`https://mvynepqulhflxtyymtzs.functions.supabase.co/waha-dashboard-proxy?path=/api/sessions/${sessionName}/start`, {
          method: 'POST',
          headers: {
            'Accept': '*/*',
            'Content-Type': 'application/json'
          }
        });
        
        if (startResponse.ok) {
          console.log('✅ Session démarrée');
          // Attendre un peu que la session soit prête
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      } catch (startError) {
        console.warn('⚠️ Erreur démarrage session (peut être déjà active):', startError);
      }

      // Essayer plusieurs endpoints QR avec ordre de priorité
      const qrEndpoints = [
        `/api/sessions/${sessionName}/auth/qr?format=base64`,
        `/api/sessions/${sessionName}/qr?format=base64`,
        `/api/sessions/${sessionName}/auth/qr`,
        `/api/sessions/${sessionName}/qr`,
        `/api/v2/sessions/${sessionName}/auth/qr?format=base64`,
        `/api/v2/sessions/${sessionName}/qr?format=base64`,
        `/api/${sessionName}/auth/qr?format=base64`,
        `/api/${sessionName}/auth/qr`
      ];

      let lastError = null;
      
      for (const endpoint of qrEndpoints) {
        try {
          console.log(`📡 Test endpoint: ${endpoint}`);
          
          const response = await fetch(`https://mvynepqulhflxtyymtzs.functions.supabase.co/waha-dashboard-proxy?path=${encodeURIComponent(endpoint)}`, {
            method: 'GET',
            headers: {
              'Accept': '*/*',
              'Content-Type': 'application/json'
            }
          });

          console.log(`📊 Response status: ${response.status}`);
          
          if (response.ok) {
            const data = await response.json();
            console.log('📱 Response data keys:', Object.keys(data));
            
            // Chercher le QR dans plusieurs champs possibles
            const qrCode = data.qr || data.qrCode || data.base64 || data.image || data.data?.qr || data.data?.base64;
            
            if (qrCode && typeof qrCode === 'string' && qrCode.length > 50) {
              // Normaliser le QR code
              let normalizedQR = qrCode.trim();
              if (!normalizedQR.startsWith('data:image')) {
                normalizedQR = `data:image/png;base64,${normalizedQR.replace(/\s+/g, '')}`;
              }
              
              setExtractedQR(normalizedQR);
              setQRExtractionStatus('success');
              onQRCodeExtracted?.(normalizedQR);
              console.log('✅ QR code extrait avec succès');
              return;
            }
          }
          
          // Enregistrer l'erreur mais continuer
          const errorData = await response.json().catch(() => ({ error: 'Parse error' }));
          lastError = `${endpoint}: ${response.status} - ${errorData.error || errorData.message || 'Unknown'}`;
          
        } catch (endpointError) {
          console.warn(`❌ Endpoint ${endpoint} failed:`, endpointError);
          lastError = `${endpoint}: ${endpointError.message}`;
        }
      }

      // Aucun endpoint n'a fonctionné
      throw new Error(`Tous les endpoints QR ont échoué. Dernière erreur: ${lastError}`);
      
    } catch (error) {
      console.error('❌ Erreur proxy API:', error);
      setQRExtractionStatus('error');
      setError(`Impossible d'extraire le QR: ${error.message}`);
    }
  };

  // Auto-extraction si demandée (une seule fois)
  useEffect(() => {
    if (autoExtractQR && sessionName && !isLoading && !error && qrExtractionStatus === 'idle') {
      console.log('🎯 Auto-extraction QR activée');
      const timer = setTimeout(() => {
        extractQRCode();
      }, 4000); // Attendre que l'iframe soit prêt
      
      return () => clearTimeout(timer);
    }
  }, [autoExtractQR, sessionName, isLoading, error]); // Retirer qrExtractionStatus des dépendances pour éviter les boucles

  // Écouter les messages de l'iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Sécurité: vérifier l'origine
      if (event.origin !== 'https://mvynepqulhflxtyymtzs.functions.supabase.co') {
        return;
      }

      if (event.data.type === 'qr-found') {
        setExtractedQR(event.data.qrCode);
        setQRExtractionStatus('success');
        onQRCodeExtracted?.(event.data.qrCode);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onQRCodeExtracted]);

  const handleIframeLoad = () => {
    console.log('Dashboard WAHA chargé avec succès');
    setIsLoading(false);
    setCspBlocked(false);
    
    // Tenter d'injecter les identifiants de connexion
    try {
      const iframe = iframeRef.current;
      if (iframe && iframe.contentWindow) {
        setTimeout(() => {
          iframe.contentWindow?.postMessage({
            type: 'auto-login',
            username: credentials.username,
            password: credentials.password
          }, 'https://waha.bot.bj');
        }, 2000);
      }
    } catch (e) {
      console.warn('Injection automatique des identifiants impossible:', e);
    }
  };

  const handleIframeError = (e: any) => {
    console.error('Erreur iframe WAHA:', e);
    setError('Erreur de chargement du dashboard WAHA');
    setIsLoading(false);
    
    // Détecter si c'est une erreur CSP
    if (e.message?.includes('CSP') || e.message?.includes('X-Frame-Options')) {
      setCspBlocked(true);
      setError('Dashboard bloqué par les politiques de sécurité (CSP/X-Frame-Options)');
    }
  };

  const openExternalDashboard = () => {
    const newWindow = window.open('https://waha.bot.bj/dashboard/', '_blank');
    if (newWindow) {
      // Afficher les identifiants dans la console pour l'utilisateur
      console.log('🔐 Identifiants WAHA:', credentials);
    }
  };

  const refreshDashboard = () => {
    setIsLoading(true);
    setError(null);
    setCspBlocked(false);
    setExtractedQR(null);
    setQRExtractionStatus('idle');
    if (iframeRef.current) {
      iframeRef.current.src = dashboardUrl + '?nocache=' + Date.now();
    }
  };

  // Fonction pour copier le QR code dans le presse-papiers
  const copyQRCode = async () => {
    if (!extractedQR) return;
    
    try {
      await navigator.clipboard.writeText(extractedQR);
      toast.success('QR code copié dans le presse-papiers');
    } catch (error) {
      console.error('Erreur copie QR:', error);
      toast.error('Erreur lors de la copie');
    }
  };

  // Fonction pour télécharger le QR code comme image
  const downloadQRCode = () => {
    if (!extractedQR || !sessionName) return;
    
    try {
      const link = document.createElement('a');
      link.href = extractedQR;
      link.download = `whatsapp-qr-${sessionName}-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('QR code téléchargé');
    } catch (error) {
      console.error('Erreur téléchargement QR:', error);
      toast.error('Erreur lors du téléchargement');
    }
  };

  // Gérer les erreurs de chargement avec un délai
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading) {
        setError('Délai de chargement dépassé - Possibles restrictions CSP');
        setCspBlocked(true);
        setIsLoading(false);
      }
    }, 8000);

    return () => clearTimeout(timeout);
  }, [isLoading]);

  // Détecter les erreurs CSP via les événements du navigateur
  useEffect(() => {
    const handleSecurityPolicyViolation = (e: SecurityPolicyViolationEvent) => {
      if (e.blockedURI?.includes('waha.bot.bj')) {
        console.error('CSP Violation détectée:', e);
        setCspBlocked(true);
        setError('Dashboard bloqué par Content Security Policy');
        setIsLoading(false);
      }
    };

    document.addEventListener('securitypolicyviolation', handleSecurityPolicyViolation);
    return () => document.removeEventListener('securitypolicyviolation', handleSecurityPolicyViolation);
  }, []);

  if (error) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            {cspBlocked ? <Shield className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
            {cspBlocked ? 'Dashboard Bloqué (CSP)' : 'Erreur Dashboard WAHA'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant={cspBlocked ? "default" : "destructive"}>
            {cspBlocked ? <Shield className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <AlertDescription>
              {error}
              {cspBlocked && (
                <div className="mt-2 text-sm">
                  <p>Le site waha.bot.bj refuse d'être affiché dans un iframe pour des raisons de sécurité.</p>
                  <p className="mt-1"><strong>Solution:</strong> Utilisez le dashboard externe ci-dessous.</p>
                </div>
              )}
            </AlertDescription>
          </Alert>
          
          {cspBlocked && (
            <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                📋 Identifiants de connexion WAHA
              </h4>
              <div className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
                <p><strong>URL:</strong> https://waha.bot.bj/dashboard/</p>
                <p><strong>Nom d'utilisateur:</strong> admin</p>
                <p><strong>Mot de passe:</strong> Starlab@007</p>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            {!cspBlocked && (
              <Button onClick={refreshDashboard} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Réessayer
              </Button>
            )}
            <Button onClick={openExternalDashboard} variant="default" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              Ouvrir Dashboard Externe
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Monitor className="h-5 w-5 text-primary" />
            <CardTitle>Dashboard WAHA Intégré</CardTitle>
            <Badge variant="outline" className="text-xs">Mirror Proxy</Badge>
          </div>
          <div className="flex items-center gap-2">
            {!isLoading && !error && (
              <Badge variant="secondary" className="gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Connecté
              </Badge>
            )}
            <Button onClick={refreshDashboard} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualiser
            </Button>
            <Button onClick={openExternalDashboard} variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              Externe
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="relative h-[600px] bg-muted/10 rounded-lg overflow-hidden border">
          {isLoading && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
              <div className="text-center space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm font-medium">Connexion au dashboard WAHA...</p>
                <p className="text-xs text-muted-foreground">
                  Authentification automatique (admin/Starlab@007)
                </p>
              </div>
            </div>
          )}
          
          <iframe
            ref={iframeRef}
            src={dashboardUrl}
            className="w-full h-full border-0"
            title="Dashboard WAHA"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation allow-downloads"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            loading="eager"
            style={{
              colorScheme: 'light dark'
            }}
          />
        </div>
        
        {/* Section d'extraction QR Code */}
        {sessionName && (
          <div className="border-t bg-muted/30">
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <QrCode className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">Extraction QR Code - {sessionName}</span>
                  {qrExtractionStatus === 'success' && (
                    <Badge variant="secondary" className="text-xs">
                      Extrait
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={extractQRCode}
                    disabled={qrExtractionStatus === 'extracting'}
                    variant="outline"
                    size="sm"
                  >
                    {qrExtractionStatus === 'extracting' ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <QrCode className="h-4 w-4 mr-2" />
                    )}
                    {qrExtractionStatus === 'extracting' ? 'Extraction...' : 'Extraire QR'}
                  </Button>
                  {extractedQR && (
                    <>
                      <Button
                        onClick={copyQRCode}
                        variant="outline"
                        size="sm"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copier
                      </Button>
                      <Button
                        onClick={downloadQRCode}
                        variant="outline"
                        size="sm"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Télécharger
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Affichage du QR code extrait */}
              {extractedQR && (
                <div className="flex justify-center">
                  <div className="bg-white p-4 rounded-lg border-2 border-primary/20 shadow-lg">
                    <img 
                      src={extractedQR} 
                      alt={`QR Code WhatsApp - ${sessionName}`}
                      className="w-48 h-48 object-contain"
                    />
                  </div>
                </div>
              )}

              {/* Messages de statut */}
              {qrExtractionStatus === 'extracting' && (
                <Alert>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <AlertDescription>
                    Extraction du QR code en cours... Cela peut prendre quelques secondes.
                  </AlertDescription>
                </Alert>
              )}

              {qrExtractionStatus === 'error' && error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              {qrExtractionStatus === 'success' && extractedQR && (
                <Alert>
                  <QrCode className="h-4 w-4" />
                  <AlertDescription>
                    ✅ QR code extrait avec succès! Scannez-le avec WhatsApp pour connecter la session.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        )}
        
        {/* Informations de connexion */}
        <div className="p-3 bg-muted/50 border-t">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>🌐 waha.bot.bj/dashboard</span>
              <span>👤 admin</span>
              <span>🔑 Starlab@007</span>
            </div>
            <span>🔄 Mirror Proxy (Méthode 1)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WAHADashboardIframe;