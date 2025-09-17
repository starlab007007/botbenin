import React, { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, ExternalLink, Share2, Link } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Déclaration TypeScript pour l'élément personnalisé ElevenLabs
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'elevenlabs-convai': {
        'agent-id': string;
        variant?: string;
        'action-text'?: string;
        'start-call-text'?: string;
        'end-call-text'?: string;
        'listening-text'?: string;
        'speaking-text'?: string;
      } & React.HTMLAttributes<HTMLElement>;
    }
  }
}

interface AgentWidgetDisplayProps {
  agent: any;
  open: boolean;
  onClose: () => void;
}

export const AgentWidgetDisplay: React.FC<AgentWidgetDisplayProps> = ({ agent, open, onClose }) => {
  const { toast } = useToast();

  const generateWidgetCode = () => {
    const config = agent.widget_config;
    return `<!-- Widget Agent IA: ${agent.name} -->
<elevenlabs-convai
  agent-id="${agent.elevenlabs_agent_id}"
  variant="${config?.variant || 'expanded'}"
  action-text="${config?.actionText || 'Nouvel appel'}"
  start-call-text="${config?.startCallText || 'Démarrer la conversation'}"
  end-call-text="${config?.endCallText || 'Terminer la conversation'}"
  listening-text="${config?.listeningText || 'J\'écoute…'}"
  speaking-text="${config?.speakingText || 'L\'agent vous parle'}"
></elevenlabs-convai>

<!-- Script nécessaire pour le widget -->
<script src="https://unpkg.com/@elevenlabs/convai-widget-embed" async type="text/javascript"></script>`;
  };

  const generateWidgetUrl = () => {
    return `${window.location.origin}/chat?agent=${agent.id}&widget=true`;
  };

  const copyWidgetCode = () => {
    navigator.clipboard.writeText(generateWidgetCode());
    toast({
      title: "Code copié !",
      description: "Le code d'intégration du widget a été copié"
    });
  };

  const copyWidgetUrl = () => {
    navigator.clipboard.writeText(generateWidgetUrl());
    toast({
      title: "URL copiée !",
      description: "L'URL du widget a été copiée"
    });
  };

  const shareOnWhatsApp = () => {
    const widgetUrl = generateWidgetUrl();
    const message = `🤖 Testez ${agent.name} - Mon agent IA conversationnel !\n\n${widgetUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const openInNewTab = () => {
    const widgetUrl = generateWidgetUrl();
    window.open(widgetUrl, '_blank');
  };

  useEffect(() => {
    // Charger le script ElevenLabs si ce n'est pas déjà fait
    if (!document.querySelector('script[src*="elevenlabs"]')) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/@elevenlabs/convai-widget-embed';
      script.async = true;
      script.type = 'text/javascript';
      document.head.appendChild(script);
    }
  }, []);

  if (!agent) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Widget de {agent.name}</span>
            <Badge variant="outline" className="capitalize">
              {agent.widget_config?.variant || 'expanded'}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informations sur l'agent */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
            <div>
              <h4 className="font-medium text-sm text-muted-foreground">Configuration du widget</h4>
              <div className="mt-2 space-y-1 text-sm">
                <div><strong>Bouton:</strong> {agent.widget_config?.actionText}</div>
                <div><strong>Démarrer:</strong> {agent.widget_config?.startCallText}</div>
                <div><strong>Terminer:</strong> {agent.widget_config?.endCallText}</div>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-sm text-muted-foreground">Détails techniques</h4>
              <div className="mt-2 space-y-1 text-sm">
                <div><strong>Agent ID:</strong> <code className="text-xs bg-background px-1 rounded">{agent.elevenlabs_agent_id.slice(0, 30)}...</code></div>
                <div><strong>Variante:</strong> <span className="capitalize">{agent.widget_config?.variant}</span></div>
              </div>
            </div>
          </div>

          {/* Actions rapides */}
          <div className="flex flex-wrap gap-2">
            <Button onClick={copyWidgetCode} variant="outline" size="sm">
              <Copy className="w-4 h-4 mr-2" />
              Copier le code d'intégration
            </Button>
            <Button onClick={copyWidgetUrl} variant="outline" size="sm">
              <Link className="w-4 h-4 mr-2" />
              Copier l'URL du widget
            </Button>
            <Button onClick={shareOnWhatsApp} variant="outline" size="sm">
              <Share2 className="w-4 h-4 mr-2" />
              Partager sur WhatsApp
            </Button>
            <Button onClick={openInNewTab} variant="outline" size="sm">
              <ExternalLink className="w-4 h-4 mr-2" />
              Ouvrir dans un nouvel onglet
            </Button>
          </div>

          {/* Prévisualisation du widget */}
          <div className="space-y-4">
            <div className="border-t pt-4">
              <h4 className="font-medium mb-4">Prévisualisation du widget</h4>
              <div className="min-h-[400px] relative bg-gradient-to-br from-background via-muted/10 to-background rounded-lg p-8">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-primary mb-2">{agent.name}</h3>
                  <p className="text-muted-foreground">
                    Testez votre agent IA en direct
                  </p>
                </div>
                
                {/* Widget ElevenLabs intégré */}
                <elevenlabs-convai
                  agent-id={agent.elevenlabs_agent_id}
                  variant={agent.widget_config?.variant || 'expanded'}
                  action-text={agent.widget_config?.actionText || 'Nouvel appel'}
                  start-call-text={agent.widget_config?.startCallText || 'Démarrer la conversation'}
                  end-call-text={agent.widget_config?.endCallText || 'Terminer la conversation'}
                  listening-text={agent.widget_config?.listeningText || 'J\'écoute…'}
                  speaking-text={agent.widget_config?.speakingText || 'L\'agent vous parle'}
                />
              </div>
            </div>
          </div>

          {/* Code d'intégration */}
          <div className="space-y-2">
            <h4 className="font-medium">Code d'intégration</h4>
            <div className="relative">
              <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto max-h-48">
                <code>{generateWidgetCode()}</code>
              </pre>
              <Button
                onClick={copyWidgetCode}
                size="sm"
                className="absolute top-2 right-2"
                variant="outline"
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>

        {/* Enhanced CSS for widget */}
        <style dangerouslySetInnerHTML={{
          __html: `
            elevenlabs-convai {
              display: block !important;
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 auto !important;
            }
            
            elevenlabs-convai iframe {
              border-radius: 12px !important;
              border: 1px solid hsl(var(--border)) !important;
              box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1) !important;
            }
          `
        }} />
      </DialogContent>
    </Dialog>
  );
};