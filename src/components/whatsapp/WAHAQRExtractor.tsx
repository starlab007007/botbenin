import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { QrCode, Loader2, Copy, Download, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface WAHAQRExtractorProps {
  sessionName: string;
  onQRExtracted?: (qrCode: string) => void;
}

const WAHAQRExtractor: React.FC<WAHAQRExtractorProps> = ({ 
  sessionName, 
  onQRExtracted 
}) => {
  const [qrCode, setQrCode] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'extracting' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string>('');

  const extractQR = async () => {
    if (status === 'extracting') return;
    
    setStatus('extracting');
    setError('');
    setQrCode('');

    try {
      console.log(`🔍 Extraction QR pour session: ${sessionName}`);

      // Étape 1: Démarrer la session si nécessaire
      console.log('▶️ Démarrage de la session...');
      try {
        const startResponse = await fetch(`https://mvynepqulhflxtyymtzs.functions.supabase.co/waha-dashboard-proxy?path=${encodeURIComponent(`/api/sessions/${sessionName}/start`)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (startResponse.ok) {
          console.log('✅ Session démarrée');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (e) {
        console.warn('⚠️ Session peut être déjà active:', e);
      }

      // Étape 2: Essayer différents endpoints QR
      const endpoints = [
        `/api/sessions/${sessionName}/auth/qr?format=base64`,
        `/api/sessions/${sessionName}/qr?format=base64`,
        `/api/sessions/${sessionName}/auth/qr`,
        `/api/sessions/${sessionName}/qr`,
        `/api/${sessionName}/auth/qr?format=base64`,
        `/api/${sessionName}/auth/qr`
      ];

      for (const endpoint of endpoints) {
        try {
          console.log(`📡 Test: ${endpoint}`);
          
          const response = await fetch(`https://mvynepqulhflxtyymtzs.functions.supabase.co/waha-dashboard-proxy?path=${encodeURIComponent(endpoint)}`, {
            method: 'GET',
            headers: { 'Accept': '*/*' }
          });

          if (response.ok) {
            const data = await response.json();
            const qr = data.qr || data.qrCode || data.base64 || data.image || data.data?.qr;
            
            if (qr && typeof qr === 'string' && qr.length > 50) {
              let normalizedQR = qr.trim();
              if (!normalizedQR.startsWith('data:image')) {
                normalizedQR = `data:image/png;base64,${normalizedQR.replace(/\s+/g, '')}`;
              }
              
              setQrCode(normalizedQR);
              setStatus('success');
              onQRExtracted?.(normalizedQR);
              toast.success('QR code extrait avec succès!');
              return;
            }
          }
        } catch (e) {
          console.warn(`❌ Endpoint ${endpoint} failed:`, e);
        }
      }

      throw new Error('Aucun endpoint QR n\'a fonctionné');
      
    } catch (error) {
      console.error('❌ Erreur extraction QR:', error);
      setStatus('error');
      setError(error.message);
      toast.error('Erreur lors de l\'extraction du QR code');
    }
  };

  const copyQR = async () => {
    if (!qrCode) return;
    try {
      await navigator.clipboard.writeText(qrCode);
      toast.success('QR code copié');
    } catch (e) {
      toast.error('Erreur lors de la copie');
    }
  };

  const downloadQR = () => {
    if (!qrCode) return;
    try {
      const link = document.createElement('a');
      link.href = qrCode;
      link.download = `whatsapp-qr-${sessionName}-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('QR code téléchargé');
    } catch (e) {
      toast.error('Erreur lors du téléchargement');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          Extraction QR Code - {sessionName}
          {status === 'success' && (
            <Badge variant="secondary" className="text-xs">
              <CheckCircle className="h-3 w-3 mr-1" />
              Extrait
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Button 
            onClick={extractQR}
            disabled={status === 'extracting'}
            variant="default"
            className="flex items-center gap-2"
          >
            {status === 'extracting' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <QrCode className="h-4 w-4" />
            )}
            {status === 'extracting' ? 'Extraction...' : 'Extraire QR Code'}
          </Button>
          
          {qrCode && (
            <div className="flex gap-2">
              <Button onClick={copyQR} variant="outline" size="sm">
                <Copy className="h-4 w-4 mr-1" />
                Copier
              </Button>
              <Button onClick={downloadQR} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-1" />
                Télécharger
              </Button>
            </div>
          )}
        </div>

        {/* Messages de statut */}
        {status === 'extracting' && (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>
              Extraction du QR code en cours... Cela peut prendre quelques secondes.
            </AlertDescription>
          </Alert>
        )}

        {status === 'error' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error || 'Erreur lors de l\'extraction du QR code'}
            </AlertDescription>
          </Alert>
        )}

        {/* Affichage du QR code */}
        {qrCode && (
          <div className="flex flex-col items-center space-y-4">
            <div className="bg-white p-4 rounded-lg border-2 border-primary/20 shadow-lg">
              <img 
                src={qrCode} 
                alt={`QR Code WhatsApp - ${sessionName}`}
                className="w-64 h-64 object-contain"
              />
            </div>
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                ✅ QR code prêt! Scannez-le avec WhatsApp pour connecter la session.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WAHAQRExtractor;