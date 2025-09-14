import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, X, AlertTriangle, Clock, QrCode, CheckCircle } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { toast } from 'sonner';

interface QRConnectionFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionName: string;
}

const QRConnectionFlow: React.FC<QRConnectionFlowProps> = ({
  open,
  onOpenChange,
  sessionName
}) => {
  const [currentStep, setCurrentStep] = useState<'warning' | 'qr'>('warning');
  const [qrImageUrl, setQrImageUrl] = useState<string>('');
  const [qrImageData, setQrImageData] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [timeRemaining, setTimeRemaining] = useState(90); // 1:30 en secondes

  const fetchQRCode = async () => {
    if (!sessionName) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`https://waha.bot.bj/api/${sessionName}/auth/qr?format=image`, {
        method: 'GET',
        headers: {
          'Accept': 'image/png',
          'X-Api-Key': '278194d40f794430851ff923e9924a3a'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur API: ${response.status} - ${response.statusText}`);
      }

      const contentType = response.headers.get('Content-Type');
      if (!contentType || !contentType.startsWith('image/')) {
        const textResponse = await response.text();
        throw new Error('La réponse n\'est pas une image');
      }

      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);
      setQrImageUrl(imageUrl);
      
      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = reader.result as string;
        setQrImageData(base64Data);
      };
      reader.readAsDataURL(blob);
      
      toast.success('QR Code généré avec succès!');
    } catch (error: any) {
      console.error('Erreur lors de la récupération du QR code:', error);
      setError(error.message || 'Erreur lors de la récupération du QR code');
      toast.error('Erreur lors de la génération du QR code: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = () => {
    setCurrentStep('qr');
    fetchQRCode();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Timer pour le QR code
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (currentStep === 'qr' && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [currentStep, timeRemaining]);

  // Reset quand le modal s'ouvre
  useEffect(() => {
    if (open) {
      setCurrentStep('warning');
      setTimeRemaining(90);
      setQrImageUrl('');
      setQrImageData('');
      setError('');
    }
  }, [open]);

  // Nettoyer l'URL d'objet
  useEffect(() => {
    return () => {
      if (qrImageUrl) {
        URL.revokeObjectURL(qrImageUrl);
      }
    };
  }, [qrImageUrl]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {currentStep === 'warning' ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FaWhatsapp className="h-5 w-5 text-green-600" />
                  <span>Connecter Agent WhatsApp</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Icône d'avertissement */}
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-orange-600" />
                </div>
              </div>

              {/* Titre */}
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-2">Important : À Lire Avant Connexion</h3>
                <p className="text-muted-foreground">
                  Vous êtes sur le point de connecter <strong>{sessionName}</strong> à un numéro WhatsApp.
                </p>
              </div>

              {/* Avertissements */}
              <Card className="bg-orange-50 border-orange-200">
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <div className="w-1 h-1 bg-orange-600 rounded-full mt-2 flex-shrink-0"></div>
                      <div className="text-sm">
                        <strong className="text-orange-800">Contrôle IA Complet :</strong> 
                        <span className="text-orange-700"> Une fois connecté, l'agent IA répondra automatiquement à TOUS les messages reçus sur ce numéro WhatsApp.</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-1 h-1 bg-orange-600 rounded-full mt-2 flex-shrink-0"></div>
                      <div className="text-sm">
                        <strong className="text-orange-800">Actif 24/7 :</strong>
                        <span className="text-orange-700"> L'agent sera actif jusqu'à ce que vous désactiviez manuellement la campagne ou vous déconnectiez.</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-1 h-1 bg-orange-600 rounded-full mt-2 flex-shrink-0"></div>
                      <div className="text-sm">
                        <strong className="text-orange-800">Utiliser un Numéro Dédié :</strong>
                        <span className="text-orange-700"> Nous recommandons d'utiliser un compte WhatsApp Business ou un numéro dédié à cet usage.</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Information de contrôle */}
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-blue-800 mb-1">Vous gardez toujours le contrôle de votre agent</h4>
                      <p className="text-sm text-blue-700">
                        Vous pouvez mettre en pause, modifier ou déconnecter complètement votre agent à tout moment depuis le tableau de bord.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Boutons d'action */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleAccept}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  Je Comprends, Continuer
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FaWhatsapp className="h-5 w-5 text-green-600" />
                  <span>Connecter Agent WhatsApp</span>
                </div>
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
              {/* Titre de connexion */}
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Connexion {sessionName}</h3>
                <p className="text-sm text-muted-foreground">
                  Scannez le code QR avec votre WhatsApp pour terminer la connexion
                </p>
              </div>

              {/* Icône WhatsApp et titre */}
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <FaWhatsapp className="w-8 h-8 text-blue-600" />
                </div>
                <h4 className="font-semibold">Connexion WhatsApp</h4>
                <p className="text-sm text-muted-foreground">
                  Connectez votre compte WhatsApp Business à {sessionName}
                </p>
              </div>

              {/* Instruction de scan */}
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                  <QrCode className="w-4 h-4" />
                  Scanner le code QR pour se connecter
                </div>
              </div>

              {/* Timer et statut */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4 text-green-600" />
                  <span>Temps restant : {formatTime(timeRemaining)}</span>
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  Actif
                </Badge>
              </div>

              {/* Zone QR Code */}
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

                    {!loading && !error && (qrImageUrl || qrImageData) && (
                      <div className="space-y-4">
                        <div className="flex justify-center p-4 bg-blue-50 rounded-lg border-2 border-dashed border-blue-200">
                          {qrImageData ? (
                            <img
                              src={qrImageData}
                              alt={`QR Code pour ${sessionName}`}
                              className="max-w-full h-auto"
                              style={{ maxHeight: '200px' }}
                            />
                          ) : (
                            <img
                              src={qrImageUrl}
                              alt={`QR Code pour ${sessionName}`}
                              className="max-w-full h-auto"
                              style={{ maxHeight: '200px' }}
                            />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Instructions étape par étape */}
              <Card>
                <CardContent className="pt-4">
                  <h4 className="font-medium mb-3 text-center">Étapes pour se connecter :</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <span className="font-semibold text-blue-600">1.</span>
                      <span>Ouvrez WhatsApp Business sur votre téléphone</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-semibold text-blue-600">2.</span>
                      <span>Appuyez sur Menu (⋮) → Appareils liés</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-semibold text-blue-600">3.</span>
                      <span>Appuyez sur "Lier un appareil"</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-semibold text-blue-600">4.</span>
                      <span>Scannez ce code QR</span>
                    </div>
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
                  Actualiser QR
                </Button>
                
                <Button
                  onClick={() => onOpenChange(false)}
                  variant="outline"
                  size="sm"
                >
                  Annuler
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default QRConnectionFlow;