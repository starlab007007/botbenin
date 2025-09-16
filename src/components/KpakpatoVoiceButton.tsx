import React from 'react';
import { Button } from '@/components/ui/button';
import { Mic, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface KpakpatoVoiceButtonProps {
  agentId?: string;
  className?: string;
  variant?: 'floating' | 'inline';
  userName?: string;
  origin?: string;
}

export const KpakpatoVoiceButton: React.FC<KpakpatoVoiceButtonProps> = ({
  agentId = 'agent_6201k518xhz2eemtsrbf38fmjq7p',
  className = '',
  variant = 'floating',
  userName,
  origin = 'bot.bj'
}) => {
  const { toast } = useToast();

  const handleVoiceChat = () => {
    // Construire l'URL avec les paramètres dynamiques
    let url = `https://elevenlabs.io/app/talk-to?agent_id=${agentId}`;
    
    if (userName) {
      url += `&user_name=${encodeURIComponent(userName)}`;
    }
    
    if (origin) {
      url += `&origin=${encodeURIComponent(origin)}`;
    }

    // Ouvrir dans un nouvel onglet
    window.open(url, '_blank', 'noopener,noreferrer');
    
    // Afficher un message de confirmation
    toast({
      title: "Redirection vers Kpakpato",
      description: "La conversation vocale s'ouvre dans un nouvel onglet.",
    });
  };

  const baseClasses = "group relative transition-all duration-300 ease-in-out";
  
  if (variant === 'floating') {
    return (
      <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
        <Button
          onClick={handleVoiceChat}
          size="lg"
          className={`${baseClasses} rounded-full h-14 w-14 shadow-lg hover:shadow-xl bg-primary hover:bg-primary/90 text-primary-foreground`}
          title="Parler avec Kpakpato"
        >
          <Mic className="h-6 w-6" />
        </Button>
        
        {/* Tooltip */}
        <div className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-background border rounded-lg shadow-md text-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          Parler avec Kpakpato
        </div>
      </div>
    );
  }

  return (
    <Button
      onClick={handleVoiceChat}
      size="lg"
      className={`${baseClasses} ${className} bg-primary hover:bg-primary/90 text-primary-foreground`}
    >
      <Mic className="h-5 w-5 mr-2" />
      Parler avec Kpakpato
      <ExternalLink className="h-4 w-4 ml-2 opacity-70" />
    </Button>
  );
};

export default KpakpatoVoiceButton;