import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, X, Copy, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const fetchQRCode = async () => {
    if (!sessionName) return;
    
    setLoading(true);
    setError('');
    
    try {
      console.log('Récupération du QR code pour la session:', sessionName);
      
      // Appel direct à l'API WAHA avec l'API key exactement comme dans la capture
      const response = await fetch(`https://waha.bot.bj/api/${sessionName}/auth/qr?format=image`, {
        method: 'GET',
        headers: {
          'Accept': 'image/png',
          'X-Api-Key': '278194d40f794430851ff923e9924a3a'
        }
      });

      console.log('Réponse API status:', response.status);
      console.log('Réponse headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erreur API response:', errorText);
        throw new Error(`Erreur API: ${response.status} - ${response.statusText}`);
      }

      // Vérifier le type de contenu
      const contentType = response.headers.get('Content-Type');
      console.log('Content-Type:', contentType);
      
      if (!contentType || !contentType.startsWith('image/')) {
        const textResponse = await response.text();
        console.error('Réponse non-image:', textResponse);
        throw new Error('La réponse n\'est pas une image');
      }

      // Convertir la réponse en blob puis en URL d'objet
      const blob = await response.blob();
      console.log('Blob créé, taille:', blob.size, 'type:', blob.type);
      
      const imageUrl = URL.createObjectURL(blob);
      console.log('URL d\'objet créée:', imageUrl);
      
      setQrImageUrl(imageUrl);
      
      toast.success('QR Code généré avec succès!');
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
    if (qrImageUrl) {
      const link = document.createElement('a');
      link.href = qrImageUrl;
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
                  <Badge variant="outline" className="bg-blue-50">GET</Badge>
                  <span className="text-sm font-mono text-muted-foreground">
                    /api/{sessionName}/auth/qr
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Endpoint: https://waha.bot.bj/api/{sessionName}/auth/qr?format=image
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

                {!loading && !error && qrImageUrl && (
                  <div className="space-y-4">
                    <div className="flex justify-center">
                      <img
                        src={qrImageUrl}
                        alt={`QR Code pour ${sessionName}`}
                        className="max-w-full h-auto border border-border rounded-lg"
                        style={{ maxHeight: '300px' }}
                      />
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
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
            
            {qrImageUrl && (
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