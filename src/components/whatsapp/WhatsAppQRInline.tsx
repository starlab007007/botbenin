import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, Download, Copy, Clock, CheckCircle, XCircle } from 'lucide-react';

interface WhatsAppQRInlineProps {
  sessionName: string;
  onConnectionSuccess?: () => void;
  onConnectionFailed?: (error: string) => void;
}

interface WAHAConnectResponse {
  session: string;
  status: 'pending' | 'connected' | 'failed';
  qr_base64?: string;
  expires_in?: number;
  error?: string;
}

interface WAHAStatusResponse {
  session: string;
  status: 'pending' | 'connected' | 'failed';
  error?: string;
}

export const WhatsAppQRInline: React.FC<WhatsAppQRInlineProps> = ({
  sessionName,
  onConnectionSuccess,
  onConnectionFailed
}) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'pending' | 'connected' | 'failed'>('idle');
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [statusPolling, setStatusPolling] = useState<NodeJS.Timeout | null>(null);
  const [expirationTimer, setExpirationTimer] = useState<NodeJS.Timeout | null>(null);

  const clearTimers = useCallback(() => {
    if (statusPolling) {
      clearInterval(statusPolling);
      setStatusPolling(null);
    }
    if (expirationTimer) {
      clearInterval(expirationTimer);
      setExpirationTimer(null);
    }
  }, [statusPolling, expirationTimer]);

  const startSession = async () => {
    setIsLoading(true);
    setStatus('pending');
    setQrCode(null);
    clearTimers();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('AUTH_REQUIRED');

      const { data, error } = await supabase.functions.invoke('waha-connect/start', {
        body: { sessionName },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;

      const response: WAHAConnectResponse = data;

      if (response.status === 'failed') {
        throw new Error(response.error || 'Failed to start session');
      }

      if (response.qr_base64) {
        setQrCode(response.qr_base64);
        setStatus('pending');
        
        // Démarrer le polling du statut
        startStatusPolling();
        
        // Démarrer le timer d'expiration
        if (response.expires_in) {
          setTimeLeft(response.expires_in);
          startExpirationTimer(response.expires_in);
        }

        toast({
          title: "QR Code généré",
          description: "Scannez le QR code avec WhatsApp",
        });
      } else {
        throw new Error('No QR code received');
      }

    } catch (error: any) {
      console.error('Failed to start session:', error);
      setStatus('failed');
      onConnectionFailed?.(error.message);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de démarrer la session",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startStatusPolling = () => {
    const interval = setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data, error } = await supabase.functions.invoke(`waha-connect/status/${sessionName}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (error) throw error;

        const statusResponse: WAHAStatusResponse = data;

        if (statusResponse.status === 'connected') {
          setStatus('connected');
          clearTimers();
          onConnectionSuccess?.();
          toast({
            title: "Connexion réussie !",
            description: "WhatsApp est maintenant connecté",
          });
        } else if (statusResponse.status === 'failed') {
          setStatus('failed');
          clearTimers();
          onConnectionFailed?.(statusResponse.error || 'Connection failed');
          toast({
            title: "Connexion échouée",
            description: statusResponse.error || "La connexion a échoué",
            variant: "destructive",
          });
        }
      } catch (error: any) {
        console.error('Status polling error:', error);
      }
    }, 3000); // Poll toutes les 3 secondes

    setStatusPolling(interval);
  };

  const startExpirationTimer = (seconds: number) => {
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 1) {
          clearTimers();
          setStatus('failed');
          toast({
            title: "QR Code expiré",
            description: "Veuillez générer un nouveau QR code",
            variant: "destructive",
          });
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    setExpirationTimer(interval);
  };

  const copyQRCode = async () => {
    if (!qrCode) return;
    
    try {
      await navigator.clipboard.writeText(qrCode);
      toast({
        title: "QR Code copié",
        description: "Le QR code a été copié dans le presse-papiers",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de copier le QR code",
        variant: "destructive",
      });
    }
  };

  const downloadQRCode = () => {
    if (!qrCode) return;

    const link = document.createElement('a');
    link.href = qrCode;
    link.download = `whatsapp-qr-${sessionName}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-blue-500" />;
      default:
        return null;
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'connected':
        return 'WhatsApp connecté avec succès !';
      case 'failed':
        return 'Connexion échouée. Veuillez réessayer.';
      case 'pending':
        return 'En attente de scan du QR code...';
      default:
        return 'Prêt à démarrer la connexion WhatsApp';
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>Connexion WhatsApp</span>
          {getStatusIcon()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Message */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            {getStatusMessage()}
          </p>
        </div>

        {/* Timer */}
        {timeLeft !== null && status === 'pending' && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Expire dans: {formatTime(timeLeft)}</span>
          </div>
        )}

        {/* QR Code Display */}
        {qrCode && status === 'pending' && (
          <div className="space-y-3">
            <div className="flex justify-center">
              <img
                src={qrCode}
                alt="WhatsApp QR Code"
                className="w-48 h-48 border rounded-lg"
              />
            </div>
            
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={copyQRCode}
                className="flex items-center gap-2"
              >
                <Copy className="h-4 w-4" />
                Copier
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadQRCode}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Télécharger
              </Button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {status === 'idle' || status === 'failed' ? (
            <Button
              onClick={startSession}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
              {status === 'failed' ? 'Réessayer' : 'Démarrer'}
            </Button>
          ) : status === 'pending' ? (
            <Button
              variant="outline"
              onClick={startSession}
              disabled={isLoading}
              className="flex-1"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Nouveau QR
            </Button>
          ) : null}
        </div>

        {/* Instructions */}
        {status === 'pending' && (
          <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md">
            <p><strong>Instructions:</strong></p>
            <ol className="list-decimal list-inside space-y-1 mt-2">
              <li>Ouvrez WhatsApp sur votre téléphone</li>
              <li>Allez dans Paramètres → Appareils liés</li>
              <li>Appuyez sur "Lier un appareil"</li>
              <li>Scannez le QR code ci-dessus</li>
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  );
};