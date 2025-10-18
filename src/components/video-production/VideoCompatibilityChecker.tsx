import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { checkVideoCompatibility } from '@/services/videoCompatibilityService';

interface VideoCompatibilityCheckerProps {
  videoUrl: string;
  onReconvert?: () => void;
}

export const VideoCompatibilityChecker = ({ videoUrl, onReconvert }: VideoCompatibilityCheckerProps) => {
  const [isChecking, setIsChecking] = useState(true);
  const [isCompatible, setIsCompatible] = useState(true);
  const [details, setDetails] = useState<any>(null);

  useEffect(() => {
    checkCompatibility();
  }, [videoUrl]);

  const checkCompatibility = async () => {
    setIsChecking(true);
    try {
      const result = await checkVideoCompatibility(videoUrl);
      setIsCompatible(result.compatible && (result.canPlayH264 ?? false));
      setDetails(result);
    } catch (error) {
      console.error('Error checking compatibility:', error);
      setIsCompatible(false);
    } finally {
      setIsChecking(false);
    }
  };

  if (isChecking) {
    return (
      <Alert>
        <Loader2 className="h-4 w-4 animate-spin" />
        <AlertTitle>Vérification de la compatibilité...</AlertTitle>
        <AlertDescription>
          Test de lecture sur votre appareil
        </AlertDescription>
      </Alert>
    );
  }

  if (!isCompatible) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>⚠️ Problème de compatibilité détecté</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>Cette vidéo pourrait ne pas fonctionner sur tous les appareils.</p>
          {details?.error && (
            <p className="text-sm">Erreur: {details.error.message || 'Codec non supporté'}</p>
          )}
          {onReconvert && (
            <Button size="sm" onClick={onReconvert} className="mt-2">
              Reconvertir en format compatible
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="border-green-500/50 bg-green-50 dark:bg-green-950">
      <CheckCircle className="h-4 w-4 text-green-600" />
      <AlertTitle className="text-green-700 dark:text-green-400">
        ✅ Vidéo compatible
      </AlertTitle>
      <AlertDescription className="text-green-600 dark:text-green-500">
        <div className="space-y-1 text-sm">
          <p>Format: MP4 H.264 + AAC</p>
          {details?.width && details?.height && (
            <p>Résolution: {details.width}x{details.height}</p>
          )}
          {details?.duration && (
            <p>Durée: {Math.round(details.duration)}s</p>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
};
