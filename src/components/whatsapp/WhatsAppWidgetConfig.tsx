import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Copy, Globe, Smartphone, MessageCircle, Eye, Code } from 'lucide-react';
import { toast } from 'sonner';
import { useBots } from '@/components/bot-conversation/hooks/useBots';

interface WhatsAppWidgetConfigProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface WidgetConfig {
  selectedBotId: string;
  buttonText: string;
  prefilledMessage: string;
  buttonType: 'circular' | 'traditional';
  textStyle: 'normal' | 'bold';
  position: 'bottom-right' | 'bottom-left';
  colors: {
    background: string;
    text: string;
    hover: string;
  };
}

const WhatsAppWidgetConfig: React.FC<WhatsAppWidgetConfigProps> = ({
  open,
  onOpenChange
}) => {
  const { bots } = useBots();
  const [config, setConfig] = useState<WidgetConfig>({
    selectedBotId: '',
    buttonText: 'Chatter avec nous',
    prefilledMessage: 'Bonjour ! Je suis intéressé(e) par vos services...',
    buttonType: 'traditional',
    textStyle: 'normal',
    position: 'bottom-right',
    colors: {
      background: '#25D366',
      text: '#ffffff',
      hover: '#128C7E'
    }
  });

  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [selectedBot, setSelectedBot] = useState<any>(null);

  useEffect(() => {
    if (config.selectedBotId) {
      const bot = bots?.find(b => b.id === config.selectedBotId);
      setSelectedBot(bot);
    }
  }, [config.selectedBotId, bots]);

  useEffect(() => {
    generateWidgetCode();
  }, [config, selectedBot]);

  const generateWidgetCode = () => {
    if (!selectedBot) {
      setGeneratedCode('<!-- Sélectionnez d\'abord un bot pour générer le code -->');
      return;
    }

    const widgetHTML = `
<!-- Widget WhatsApp - Bot.bj -->
<div id="whatsapp-widget-${selectedBot.id}" style="
  position: fixed;
  ${config.position === 'bottom-right' ? 'bottom: 20px; right: 20px;' : 'bottom: 20px; left: 20px;'}
  z-index: 9999;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
">
  ${config.buttonType === 'circular' ? `
  <div onclick="openWhatsAppChat_${selectedBot.id}()" style="
    width: 60px;
    height: 60px;
    background-color: ${config.colors.background};
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    transition: all 0.3s ease;
  " onmouseover="this.style.backgroundColor='${config.colors.hover}'" onmouseout="this.style.backgroundColor='${config.colors.background}'">
    <svg width="30" height="30" viewBox="0 0 24 24" fill="${config.colors.text}">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
    </svg>
  </div>
  ` : `
  <div onclick="openWhatsAppChat_${selectedBot.id}()" style="
    background-color: ${config.colors.background};
    color: ${config.colors.text};
    padding: 12px 20px;
    border-radius: 25px;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.3s ease;
    font-weight: ${config.textStyle === 'bold' ? 'bold' : 'normal'};
  " onmouseover="this.style.backgroundColor='${config.colors.hover}'" onmouseout="this.style.backgroundColor='${config.colors.background}'">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
    </svg>
    ${config.buttonText}
  </div>
  `}
</div>

<script>
function openWhatsAppChat_${selectedBot.id}() {
  const message = encodeURIComponent("${config.prefilledMessage}");
  const botUrl = "${window.location.origin}/chat/${selectedBot.id}";
  
  // Vérifier si on est sur mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  if (isMobile) {
    // Sur mobile, ouvrir WhatsApp ou l'app de chat
    window.open(\`https://wa.me/?text=\${message}\`, '_blank');
  } else {
    // Sur desktop, ouvrir le chat bot dans une nouvelle fenêtre
    window.open(botUrl + '?message=' + message, '_blank', 'width=400,height=600,scrollbars=yes,resizable=yes');
  }
}
</script>

<!-- Fin du Widget WhatsApp -->`.trim();

    setGeneratedCode(widgetHTML);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedCode);
      toast.success('Code copié dans le presse-papiers !');
    } catch (err) {
      toast.error('Erreur lors de la copie');
    }
  };

  const testWidget = () => {
    if (!selectedBot) {
      toast.error('Sélectionnez d\'abord un bot');
      return;
    }
    
    const testUrl = `${window.location.origin}/chat/${selectedBot.id}?message=${encodeURIComponent(config.prefilledMessage)}`;
    window.open(testUrl, '_blank', 'width=400,height=600,scrollbars=yes,resizable=yes');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Code className="w-5 h-5" />
            <span>Configuration du Widget WhatsApp</span>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Configuration */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageCircle className="w-4 h-4" />
                  <span>Sélectionner le Bot</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="bot-select">Bot à connecter</Label>
                  <Select value={config.selectedBotId} onValueChange={(value) => setConfig({...config, selectedBotId: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisissez un bot..." />
                    </SelectTrigger>
                    <SelectContent>
                      {bots?.map((bot) => (
                        <SelectItem key={bot.id} value={bot.id}>
                          <div className="flex items-center space-x-2">
                            <span>{bot.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {bot.is_active ? 'Actif' : 'Inactif'}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Configuration du Widget</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="button-text">Texte du Bouton (Optionnel)</Label>
                  <Input
                    id="button-text"
                    value={config.buttonText}
                    onChange={(e) => setConfig({...config, buttonText: e.target.value})}
                    placeholder="Chatter avec nous"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Texte personnalisé pour le bouton. Laissez vide pour utiliser la valeur par défaut.
                  </p>
                </div>

                <div>
                  <Label htmlFor="prefilled-message">Message Pré-rempli (Optionnel)</Label>
                  <Textarea
                    id="prefilled-message"
                    value={config.prefilledMessage}
                    onChange={(e) => setConfig({...config, prefilledMessage: e.target.value})}
                    placeholder="Bonjour ! Je suis intéressé(e) par vos services..."
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Ce message sera pré-rempli lorsque les visiteurs cliquent sur le widget
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Type de Bouton</Label>
                    <Select value={config.buttonType} onValueChange={(value: 'circular' | 'traditional') => setConfig({...config, buttonType: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="circular">Circulaire</SelectItem>
                        <SelectItem value="traditional">Traditionnel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Style du Texte</Label>
                    <Select value={config.textStyle} onValueChange={(value: 'normal' | 'bold') => setConfig({...config, textStyle: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="bold">Gras</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Position</Label>
                  <Select value={config.position} onValueChange={(value: 'bottom-right' | 'bottom-left') => setConfig({...config, position: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bottom-right">Bas à droite</SelectItem>
                      <SelectItem value="bottom-left">Bas à gauche</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Aperçu et Code */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Eye className="w-4 h-4" />
                  <span>Aperçu du Site Web</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-100 rounded-lg p-4 min-h-[300px] relative border-2 border-dashed border-gray-300">
                  <div className="absolute top-2 left-2 flex space-x-1">
                    <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  </div>
                  
                  <div className="mt-8 space-y-4">
                    <div className="bg-white h-8 rounded w-3/4"></div>
                    <div className="bg-white h-4 rounded w-1/2"></div>
                    <div className="bg-white h-4 rounded w-2/3"></div>
                  </div>

                  {/* Widget Preview */}
                  <div 
                    className={`absolute ${config.position === 'bottom-right' ? 'bottom-4 right-4' : 'bottom-4 left-4'}`}
                    style={{ zIndex: 10 }}
                  >
                    {config.buttonType === 'circular' ? (
                      <div 
                        className="w-15 h-15 rounded-full flex items-center justify-center cursor-pointer shadow-lg"
                        style={{ backgroundColor: config.colors.background }}
                      >
                        <MessageCircle className="w-6 h-6" style={{ color: config.colors.text }} />
                      </div>
                    ) : (
                      <div 
                        className="px-4 py-3 rounded-full cursor-pointer shadow-lg flex items-center space-x-2"
                        style={{ 
                          backgroundColor: config.colors.background,
                          color: config.colors.text,
                          fontWeight: config.textStyle === 'bold' ? 'bold' : 'normal'
                        }}
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span className="text-sm">{config.buttonText}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex space-x-2">
                  <Button variant="outline" size="sm" onClick={testWidget} className="flex items-center space-x-2">
                    <Globe className="w-4 h-4" />
                    <span>Tester le Widget</span>
                  </Button>
                  <p className="text-xs text-muted-foreground flex items-center">
                    Cliquez pour tester le lien WhatsApp
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Code className="w-4 h-4" />
                    <span>Code HTML Généré</span>
                  </div>
                  <Button onClick={copyToClipboard} size="sm" variant="outline">
                    <Copy className="w-4 h-4 mr-2" />
                    Copier le Code
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs font-mono max-h-60 overflow-y-auto">
                  <pre>{generatedCode}</pre>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Copiez et intégrez ce code dans votre site web pour ajouter le widget
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WhatsAppWidgetConfig;