import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, X, Copy, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface DirectQRDisplayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionName: string;
}

const DirectQRDisplay: React.FC<DirectQRDisplayProps> = ({
  open,
  onOpenChange,
  sessionName
}) => {
  const [qrImageUrl, setQrImageUrl] = useState<string>('');
  const [qrImageData, setQrImageData] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const fetchQRCode = async () => {
    if (!sessionName) return;
    
    setLoading(true);
    setError('');
    
    try {
      console.log('Récupération du QR code pour la session:', sessionName);
      
      // Essayer plusieurs endpoints pour récupérer le QR code
      const endpoints = [
        { path: `/api/${sessionName}/auth/qr?format=image`, method: 'GET' },
        { path: `/api/default/auth/qr?format=image`, method: 'GET' },
        { path: `/api/screenshot?session=${sessionName}`, method: 'GET' },
      ];
      
      let qrCode: string | undefined;
      let lastError: any = null;
      
      for (const endpoint of endpoints) {
        try {
          console.log('Essai endpoint:', endpoint.path);
          
          const { data, error: proxyError } = await supabase.functions.invoke('waha-dashboard-proxy', {
            body: {
              path: endpoint.path,
              method: endpoint.method
            }
          });

          if (proxyError) {
            console.warn('Erreur proxy pour', endpoint.path, ':', proxyError);
            lastError = proxyError;
            continue;
          }

          console.log('Réponse QR:', data);

          // Extraire le QR code de la réponse selon le format
          if (data?.mimetype?.includes('image') && data?.data) {
            // Format base64 avec mimetype
            qrCode = `data:${data.mimetype};base64,${data.data}`;
          } else if (data?.qr) {
            qrCode = data.qr;
          } else if (data?.base64) {
            qrCode = data.base64;
          } else if (data?.image) {
            qrCode = data.image;
          } else if (typeof data === 'string' && data.includes('data:image')) {
            qrCode = data;
          } else if (data?.data && typeof data.data === 'string' && data.data.startsWith('\x89PNG')) {
            // Données binaires PNG - ne peuvent pas être directement affichées
            console.log('Données PNG binaires détectées, essai du prochain endpoint');
            continue;
          }

          if (qrCode) {
            // Normaliser en base64 avec préfixe si nécessaire
            if (!qrCode.startsWith('data:image')) {
              qrCode = `data:image/png;base64,${qrCode}`;
            }
            break;
          }
        } catch (endpointError) {
          console.warn('Erreur pour endpoint', endpoint.path, ':', endpointError);
          lastError = endpointError;
        }
      }

      if (qrCode) {
        setQrImageData(qrCode);
        toast.success('QR Code généré avec succès!');
      } else {
        throw new Error(lastError?.message || 'Aucun QR code trouvé dans les réponses WAHA');
      }
      
    } catch (error: any) {
      console.error('Erreur lors de la récupération du QR code:', error);
      setError(error.message || 'Erreur lors de la récupération du QR code');
      toast.error('Erreur lors de la génération du QR code: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const copyQRUrl = () => {
    const url = `https://waha.bot.bj/api/${sessionName}/auth/qr?format=image`;
    navigator.clipboard.writeText(url);
    toast.success('URL du QR code copiée!');
  };

  const downloadQR = () => {
    if (qrImageData) {
      const link = document.createElement('a');
      link.href = qrImageData;
      link.download = `whatsapp-qr-${sessionName}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('QR Code téléchargé!');
    }
  };

  // Nettoyer l'URL d'objet quand le composant est démonté
  useEffect(() => {
    return () => {
      if (qrImageUrl) {
        URL.revokeObjectURL(qrImageUrl);
      }
    };
  }, [qrImageUrl]);

  // Récupérer le QR code quand le modal s'ouvre
  useEffect(() => {
    if (open && sessionName) {
      fetchQRCode();
    }
  }, [open, sessionName]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            QR Code WhatsApp - {sessionName}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informations de l'endpoint */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-blue-50">Sécurisé</Badge>
                  <span className="text-sm font-mono text-muted-foreground">
                    via Edge Function proxy
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Session: {sessionName}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Zone d'affichage du QR code */}
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                {loading && (
                  <div className="flex flex-col items-center gap-3 py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">
                      Génération du QR code en cours...
                    </p>
                  </div>
                )}

                {error && (
                  <div className="flex flex-col items-center gap-3 py-8">
                    <div className="text-red-500 text-sm font-medium">
                      {error}
                    </div>
                    <Button
                      onClick={fetchQRCode}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Réessayer
                    </Button>
                  </div>
                )}

                {!loading && !error && qrImageData && (
                  <div className="space-y-4">
                    <div className="flex justify-center">
                      <img
                        src={qrImageData}
                        alt={`QR Code pour ${sessionName}`}
                        className="max-w-full h-auto border border-border rounded-lg"
                        style={{ maxHeight: '300px' }}
                        onError={(e) => {
                          console.error('Erreur affichage QR:', e);
                        }}
                      />
                    </div>
                    
                    <div className="text-sm text-muted-foreground text-center">
                      Scannez ce QR code avec WhatsApp pour connecter la session
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-2 justify-center">
            <Button
              onClick={fetchQRCode}
              variant="outline"
              size="sm"
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
            
            <Button
              onClick={copyQRUrl}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Copy className="h-4 w-4" />
              Copier URL
            </Button>
            
            {qrImageData && (
              <Button
                onClick={downloadQR}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                Télécharger
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DirectQRDisplay;
