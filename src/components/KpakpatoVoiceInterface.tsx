import React, { useState } from 'react';
import { KpakpatoConversation } from './KpakpatoConversation';
import { Button } from '@/components/ui/button';
import { Mic, MessageSquare } from 'lucide-react';

interface KpakpatoVoiceInterfaceProps {
  variant?: 'floating' | 'inline';
  className?: string;
}

export const KpakpatoVoiceInterface: React.FC<KpakpatoVoiceInterfaceProps> = ({
  variant = 'floating',
  className = ''
}) => {
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = () => {
    setIsActive(!isActive);
    if (error) setError(null);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    setIsActive(false);
  };

  if (variant === 'floating') {
    return (
      <>
        {/* Bouton flottant */}
        <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
          <Button
            onClick={handleToggle}
            size="lg"
            className="group relative rounded-full h-14 w-14 shadow-lg hover:shadow-xl bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 ease-in-out"
            title="Parler avec Kpakpato"
          >
            {isActive ? (
              <MessageSquare className="h-6 w-6" />
            ) : (
              <Mic className="h-6 w-6" />
            )}
          </Button>
          
          {/* Tooltip */}
          <div className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-background border rounded-lg shadow-md text-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            {isActive ? 'Conversation active' : 'Parler avec Kpakpato'}
          </div>
        </div>

        {/* Interface de conversation */}
        <KpakpatoConversation
          isActive={isActive}
          onToggle={handleToggle}
          onError={handleError}
        />
      </>
    );
  }

  return (
    <div className={`inline-block ${className}`}>
      <Button
        onClick={handleToggle}
        size="lg"
        className="bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 ease-in-out"
      >
        {isActive ? (
          <>
            <MessageSquare className="h-5 w-5 mr-2" />
            Conversation active
          </>
        ) : (
          <>
            <Mic className="h-5 w-5 mr-2" />
            Parler avec Kpakpato
          </>
        )}
      </Button>

      {/* Interface de conversation */}
      <KpakpatoConversation
        isActive={isActive}
        onToggle={handleToggle}
        onError={handleError}
      />
    </div>
  );
};

export default KpakpatoVoiceInterface;