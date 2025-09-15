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
  const [timeRemaining, setTimeRemaining] = useState(90);
  const [sessionConnected, setSessionConnected] = useState(false);

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
        throw new Error(`Réponse inattendue: ${textResponse}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setQrImageUrl(url);
      
      // Convertir en base64 pour l'affichage
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setQrImageData(reader.result);
        }
      };
      reader.readAsDataURL(blob);
      
      setLoading(false);
      setTimeRemaining(90);
      
    } catch (error) {
      console.error('Erreur lors de la récupération du QR code:', error);
      setError(error instanceof Error ? error.message : 'Erreur inconnue');
      setLoading(false);
    }
  };

  const checkSessionStatus = async () => {
    if (!sessionName) return;
    
    try {
      const response = await fetch(`https://waha.bot.bj/api/${sessionName}/status`, {
        method: 'GET',
        headers: {
          'X-Api-Key': '278194d40f794430851ff923e9924a3a'
        }
      });

      if (response.ok) {
        const status = await response.json();
        if (status.status === 'WORKING') {
          setSessionConnected(true);
          toast.success('WhatsApp connecté avec succès!');
          // Fermeture automatique après succès
          setTimeout(() => {
            onOpenChange(false);
          }, 3000);
        }
      }
    } catch (error) {
      console.error('Erreur lors de la vérification du statut:', error);
    }
  };

  const resetState = () => {
    setCurrentStep('warning');
    setQrImageUrl('');
    setQrImageData('');
    setError('');
    setTimeRemaining(90);
    setSessionConnected(false);
  };

  // Timer pour le QR code
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (currentStep === 'qr' && timeRemaining > 0 && !sessionConnected) {
      timer = setTimeout(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
    } else if (timeRemaining === 0) {
      setError('Le QR code a expiré. Veuillez en générer un nouveau.');
    }

    return () => clearTimeout(timer);
  }, [currentStep, timeRemaining, sessionConnected]);

  // Vérification périodique du statut de la session
  useEffect(() => {
    let statusChecker: NodeJS.Timeout;
    
    if (currentStep === 'qr' && !sessionConnected) {
      statusChecker = setInterval(checkSessionStatus, 3000);
    }

    return () => clearInterval(statusChecker);
  }, [currentStep, sessionConnected, sessionName]);

  // Reset à l'ouverture
  useEffect(() => {
    if (open) {
      resetState();
    }
  }, [open]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleProceedToQR = () => {
    setCurrentStep('qr');
    fetchQRCode();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between text-base md:text-lg">
            <div className="flex items-center gap-2">
              <FaWhatsapp className="h-5 w-5 md:h-6 md:w-6 text-green-600" />
              Connexion WhatsApp - {sessionName}
            </div>
            {!sessionConnected && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 md:space-y-6">
          {/* Étape d'avertissement */}
          {currentStep === 'warning' && !sessionConnected && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-4 md:p-6">
                <div className="flex flex-col sm:flex-row items-start gap-3 md:gap-4">
                  <AlertTriangle className="h-6 w-6 md:h-8 md:w-8 text-orange-600 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-orange-800 text-sm md:text-base mb-2">
                      Important à lire avant de continuer
                    </h3>
                    <div className="text-orange-700 text-xs md:text-sm space-y-2">
                      <p>• Assurez-vous que WhatsApp n'est pas ouvert sur un autre appareil</p>
                      <p>• Gardez votre téléphone à proximité pour scanner le QR code</p>
                      <p>• La connexion peut prendre quelques secondes après le scan</p>
                      <p>• Ne fermez pas cette fenêtre pendant la connexion</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2 mt-4">
                  <Button 
                    onClick={handleProceedToQR}
                    className="flex-1 gap-2"
                  >
                    <QrCode className="h-4 w-4" />
                    J'ai compris, générer le QR code
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => onOpenChange(false)}
                    className="flex-1"
                  >
                    Annuler
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Étape QR Code */}
          {currentStep === 'qr' && !sessionConnected && (
            <div className="space-y-4 md:space-y-6">
              {/* Timer et statut */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Temps restant: <span className="font-mono font-semibold">{formatTime(timeRemaining)}</span>
                  </span>
                </div>
                
                {!loading && !error && (
                  <Badge variant="secondary" className="text-xs">
                    En attente du scan...
                  </Badge>
                )}
              </div>

              {/* QR Code Display */}
              <Card>
                <CardContent className="p-4 md:p-8">
                  {loading && (
                    <div className="flex flex-col items-center justify-center py-8 md:py-12">
                      <Loader2 className="h-8 w-8 md:h-12 md:w-12 animate-spin text-primary mb-4" />
                      <p className="text-sm md:text-base text-muted-foreground">Génération du QR code...</p>
                    </div>
                  )}

                  {error && (
                    <div className="text-center py-8 md:py-12">
                      <AlertTriangle className="h-8 w-8 md:h-12 md:w-12 text-red-500 mx-auto mb-4" />
                      <p className="text-red-600 text-sm md:text-base mb-4">{error}</p>
                      <Button onClick={fetchQRCode} variant="outline" size="sm">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Réessayer
                      </Button>
                    </div>
                  )}

                  {qrImageData && !loading && !error && (
                    <div className="flex flex-col items-center space-y-4">
                      <div className="bg-white p-4 rounded-lg shadow-inner">
                        <img 
                          src={qrImageData} 
                          alt="QR Code WhatsApp" 
                          className="w-48 h-48 md:w-64 md:h-64"
                        />
                      </div>
                      
                      <div className="text-center space-y-2">
                        <p className="text-sm md:text-base font-medium">
                          Scannez ce QR code avec WhatsApp
                        </p>
                        <p className="text-xs md:text-sm text-muted-foreground max-w-md">
                          Ouvrez WhatsApp sur votre téléphone → Menu (⋮) → Appareils liés → Lier un appareil
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  onClick={fetchQRCode} 
                  variant="outline" 
                  disabled={loading}
                  className="flex-1 gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Nouveau QR code
                </Button>
                
                <Button 
                  onClick={() => onOpenChange(false)} 
                  variant="outline"
                  className="flex-1"
                >
                  Fermer
                </Button>
              </div>
            </div>
          )}

          {/* État de connexion réussie */}
          {sessionConnected && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4 md:p-6">
                <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                  <CheckCircle className="h-12 w-12 md:h-16 md:w-16 text-green-600 flex-shrink-0 animate-scale-in" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-green-800 text-base md:text-lg mb-2">
                      Connexion réussie ! 🎉
                    </h3>
                    <p className="text-green-700 text-sm md:text-base">
                      Votre session WhatsApp <span className="font-mono font-semibold">{sessionName}</span> est maintenant active.
                      Cette fenêtre va se fermer automatiquement...
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QRConnectionFlow;