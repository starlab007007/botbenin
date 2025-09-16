import React, { useState } from 'react';
import { KpakpatoConversation } from './KpakpatoConversation';
import { ElevenLabsDiagnostic } from './ElevenLabsDiagnostic';
import { Button } from '@/components/ui/button';
import { Settings, Phone } from 'lucide-react';

export const KpakpatoFloatingButton: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDiagnostic, setShowDiagnostic] = useState(false);

  const handleToggle = () => {
    setIsActive(!isActive);
    setError(null);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    setIsActive(false);
  };

  if (showDiagnostic) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
        <div className="w-full max-w-2xl max-h-[80vh] overflow-auto bg-background border rounded-lg shadow-lg">
          <div className="sticky top-0 bg-background border-b px-4 py-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Diagnostic ElevenLabs</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDiagnostic(false)}
            >
              Fermer
            </Button>
          </div>
          <ElevenLabsDiagnostic />
        </div>
      </div>
    );
  }

  return (
    <>
      <KpakpatoConversation
        isActive={isActive}
        onToggle={handleToggle}
        onError={handleError}
      />

      {/* Bouton diagnostic */}
      <div className="fixed bottom-20 right-6 z-[9998]">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDiagnostic(true)}
          className="rounded-full shadow-lg"
          title="Diagnostic ElevenLabs"
        >
          <Settings className="w-4 h-4" />
        </Button>
      </div>

      {/* Accessibility: erreur pour les lecteurs d'écran */}
      {error && (
        <div className="sr-only" aria-live="polite" role="alert">
          Erreur Kpakpato: {error}
        </div>
      )}
    </>
  );
};

export default KpakpatoFloatingButton;