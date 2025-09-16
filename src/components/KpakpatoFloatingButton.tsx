import React, { useState } from 'react';
import { KpakpatoConversation } from './KpakpatoConversation';

export const KpakpatoFloatingButton: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = () => {
    setIsActive(!isActive);
    setError(null);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    setIsActive(false);
  };

  return (
    <>
      <KpakpatoConversation
        isActive={isActive}
        onToggle={handleToggle}
        onError={handleError}
      />

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