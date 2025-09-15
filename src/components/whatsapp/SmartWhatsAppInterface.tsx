import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  MessageSquare, 
  Smartphone, 
  Webhook, 
  Code, 
  CheckCircle,
  ArrowRight,
  QrCode,
  Globe,
  Copy,
  Eye,
  Zap,
  Bot,
  Link2,
  Sparkles
} from "lucide-react";
import { toast } from 'sonner';
import { useWhatsAppAccounts } from '@/hooks/useWhatsAppAccounts';
import { useBots } from '@/components/bot-conversation/hooks/useBots';
import SimpleSessionManager from './SimpleSessionManager';
import WebhookConfigModal from './WebhookConfigModal';

interface SmartWhatsAppInterfaceProps {
  onSessionUpdate?: () => void;
}

const SmartWhatsAppInterface: React.FC<SmartWhatsAppInterfaceProps> = ({
  onSessionUpdate
}) => {
  const { accounts, loadData } = useWhatsAppAccounts();
  const { bots } = useBots();
  
  const [activeSection, setActiveSection] = useState<'overview' | 'connect' | 'configure'>('overview');
  const [showSessionManager, setShowSessionManager] = useState(false);
  const [showWebhookConfig, setShowWebhookConfig] = useState(false);
  const [selectedSessionName, setSelectedSessionName] = useState<string>('');
  
  // Configuration du widget intégrée
  const [widgetConfig, setWidgetConfig] = useState({
    selectedBotId: '',
    buttonText: 'Chatter avec nous',
    prefilledMessage: 'Bonjour ! Je suis intéressé(e) par vos services...',
    buttonType: 'traditional' as 'circular' | 'traditional',
    position: 'bottom-right' as 'bottom-right' | 'bottom-left'
  });

  const [generatedWidgetCode, setGeneratedWidgetCode] = useState('');

  // État des connexions
  const connectedSessions = accounts?.filter(account => account.status === 'WORKING') || [];
  const hasConnectedSessions = connectedSessions.length > 0;
  const hasWebhookConfigured = connectedSessions.some(account => account.webhook_url);
  const selectedBot = bots?.find(bot => bot.id === widgetConfig.selectedBotId);

  useEffect(() => {
    if (hasConnectedSessions && !activeSection.includes('configure')) {
      setActiveSection('configure');
    }
  }, [hasConnectedSessions]);

  // Afficher automatiquement le gestionnaire de session si aucune session n'est connectée
  useEffect(() => {
    if (!hasConnectedSessions && accounts !== undefined) {
      setShowSessionManager(true);
    }
  }, [hasConnectedSessions, accounts]);

  useEffect(() => {
    generateWidgetCode();
  }, [widgetConfig, selectedBot]);

  const generateWidgetCode = () => {
    if (!selectedBot) {
      setGeneratedWidgetCode('<!-- Sélectionnez d\'abord un bot pour générer le code -->');
      return;
    }

    const widgetHTML = `
<!-- Widget WhatsApp - Bot.bj -->
<div id="whatsapp-widget-${selectedBot.id}" style="position: fixed; ${widgetConfig.position === 'bottom-right' ? 'bottom: 20px; right: 20px;' : 'bottom: 20px; left: 20px;'} z-index: 9999; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  ${widgetConfig.buttonType === 'circular' ? `
  <div onclick="openWhatsAppChat_${selectedBot.id}()" style="width: 60px; height: 60px; background-color: #25D366; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.15); transition: all 0.3s ease;" onmouseover="this.style.backgroundColor='#128C7E'" onmouseout="this.style.backgroundColor='#25D366'">
    <svg width="30" height="30" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/></svg>
  </div>` : `
  <div onclick="openWhatsAppChat_${selectedBot.id}()" style="background-color: #25D366; color: white; padding: 12px 20px; border-radius: 25px; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.15); display: flex; align-items: center; gap: 8px; transition: all 0.3s ease;" onmouseover="this.style.backgroundColor='#128C7E'" onmouseout="this.style.backgroundColor='#25D366'">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/></svg>
    ${widgetConfig.buttonText}
  </div>`}
</div>

<script>
function openWhatsAppChat_${selectedBot.id}() {
  const message = encodeURIComponent("${widgetConfig.prefilledMessage}");
  const botUrl = "${window.location.origin}/chat/${selectedBot.id}";
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  if (isMobile) {
    window.open(\`https://wa.me/?text=\${message}\`, '_blank');
  } else {
    window.open(botUrl + '?message=' + message, '_blank', 'width=400,height=600,scrollbars=yes,resizable=yes');
  }
}
</script>`.trim();

    setGeneratedWidgetCode(widgetHTML);
  };

  const copyWidgetCode = async () => {
    try {
      await navigator.clipboard.writeText(generatedWidgetCode);
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
    const testUrl = `${window.location.origin}/chat/${selectedBot.id}?message=${encodeURIComponent(widgetConfig.prefilledMessage)}`;
    window.open(testUrl, '_blank', 'width=400,height=600,scrollbars=yes,resizable=yes');
  };

  return (
    <div className="space-y-6">
      {/* En-tête principal */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-3 mb-4">
          <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center">
            <MessageSquare className="w-8 h-8 text-green-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Automatisation WhatsApp IA</h1>
            <p className="text-muted-foreground text-lg">
              Transformez votre WhatsApp en un puissant générateur de leads avec l'IA
            </p>
          </div>
        </div>
      </div>

      {/* Interface intelligente unifiée */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Panneau de connexion */}
        <div className="lg:col-span-1">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Smartphone className="w-5 h-5 text-green-600" />
                <span>Connexion WhatsApp</span>
                {hasConnectedSessions && (
                  <Badge variant="default" className="bg-green-100 text-green-700">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Connecté
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!hasConnectedSessions ? (
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto">
                    <QrCode className="w-10 h-10 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Scannez le QR Code</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Connectez votre numéro WhatsApp en scannant le code QR avec votre téléphone
                    </p>
                    <Button 
                      onClick={() => setShowSessionManager(true)}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      <QrCode className="w-4 h-4 mr-2" />
                      Connecter WhatsApp
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Sessions actives</span>
                    <Badge variant="outline">{connectedSessions.length}</Badge>
                  </div>
                  {connectedSessions.map((session) => (
                    <div key={session.session_name} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm font-medium">{session.session_name}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">Actif</Badge>
                    </div>
                  ))}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowSessionManager(true)}
                    className="w-full"
                  >
                    Gérer les Sessions
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Panneau de configuration principal */}
        <div className="lg:col-span-2">
          {!hasConnectedSessions ? (
            <Card className="h-fit">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div className="w-24 h-24 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto">
                    <Zap className="w-12 h-12 text-gray-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Prêt à Commencer ?</h3>
                    <p className="text-muted-foreground">
                      Connectez d'abord votre numéro WhatsApp pour débloquer toutes les fonctionnalités d'automatisation
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Configuration Webhook */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Webhook className="w-5 h-5 text-blue-600" />
                      <span>Intégration Webhook</span>
                      {hasWebhookConfigured && (
                        <Badge variant="default" className="bg-blue-100 text-blue-700">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Configuré
                        </Badge>
                      )}
                    </div>
                    <Button
                      onClick={() => {
                        setSelectedSessionName(connectedSessions[0]?.session_name || '');
                        setShowWebhookConfig(true);
                      }}
                      size="sm"
                      variant={hasWebhookConfigured ? "outline" : "default"}
                    >
                      {hasWebhookConfigured ? 'Modifier' : 'Configurer'}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Connectez vos formulaires de capture de leads pour déclencher automatiquement des conversations WhatsApp
                  </p>
                  {hasWebhookConfigured && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm text-blue-800">
                        ✓ Webhook configuré et prêt à recevoir les leads de vos formulaires
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Configuration Widget */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Code className="w-5 h-5 text-purple-600" />
                    <span>Widget Site Web</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Ajoutez un bouton WhatsApp flottant sur votre site web
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Bot à connecter</Label>
                      <Select value={widgetConfig.selectedBotId} onValueChange={(value) => setWidgetConfig({...widgetConfig, selectedBotId: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choisissez un bot..." />
                        </SelectTrigger>
                        <SelectContent>
                          {bots?.map((bot) => (
                            <SelectItem key={bot.id} value={bot.id}>
                              {bot.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Style du bouton</Label>
                      <Select value={widgetConfig.buttonType} onValueChange={(value: 'circular' | 'traditional') => setWidgetConfig({...widgetConfig, buttonType: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="circular">Circulaire</SelectItem>
                          <SelectItem value="traditional">Avec texte</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {widgetConfig.buttonType === 'traditional' && (
                    <div>
                      <Label>Texte du bouton</Label>
                      <Input
                        value={widgetConfig.buttonText}
                        onChange={(e) => setWidgetConfig({...widgetConfig, buttonText: e.target.value})}
                        placeholder="Chatter avec nous"
                      />
                    </div>
                  )}

                  <div>
                    <Label>Message initial</Label>
                    <Textarea
                      value={widgetConfig.prefilledMessage}
                      onChange={(e) => setWidgetConfig({...widgetConfig, prefilledMessage: e.target.value})}
                      placeholder="Bonjour ! Je suis intéressé(e) par vos services..."
                      rows={2}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button onClick={copyWidgetCode} size="sm" disabled={!selectedBot}>
                      <Copy className="w-4 h-4 mr-2" />
                      Copier le Code
                    </Button>
                  </div>

                  {selectedBot && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-2">Aperçu du code généré :</p>
                      <code className="text-xs bg-white p-2 rounded border block overflow-x-auto">
                        {generatedWidgetCode.substring(0, 100)}...
                      </code>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Gestionnaire de Session en page complète */}
      {showSessionManager && (
        <div className="fixed inset-0 bg-background z-50 overflow-y-auto">
          <div className="container mx-auto p-6 max-w-7xl">
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowSessionManager(false);
                      loadData();
                      onSessionUpdate?.();
                    }}
                  >
                    ← Retour
                  </Button>
                  <div>
                    <h1 className="text-2xl font-bold">Gestionnaire de Session WhatsApp</h1>
                    <p className="text-muted-foreground">Gérez vos sessions WhatsApp et configurez vos automatisations</p>
                  </div>
                </div>
              </div>
            </div>
            <SimpleSessionManager />
          </div>
        </div>
      )}

      <WebhookConfigModal
        open={showWebhookConfig}
        onOpenChange={setShowWebhookConfig}
        sessionName={selectedSessionName}
      />
    </div>
  );
};

export default SmartWhatsAppInterface;