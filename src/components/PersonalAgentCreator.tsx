import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Copy, ExternalLink, Settings, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface WidgetConfig {
  actionText: string;
  startCallText: string;
  endCallText: string;
  listeningText: string;
  speakingText: string;
  variant: 'compact' | 'expanded';
}

interface PersonalAgent {
  id: string;
  name: string;
  elevenlabs_agent_id: string;
  widget_config: WidgetConfig;
  created_at: string;
  is_active: boolean;
}

interface PersonalAgentCreatorProps {
  open: boolean;
  onClose: () => void;
  onAgentCreated: () => void;
}

export const PersonalAgentCreator: React.FC<PersonalAgentCreatorProps> = ({ 
  open, 
  onClose, 
  onAgentCreated 
}) => {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [integrationCode, setIntegrationCode] = useState('');
  const [agentId, setAgentId] = useState('');
  const [agentName, setAgentName] = useState('');
  const [widgetConfig, setWidgetConfig] = useState<WidgetConfig>({
    actionText: 'Nouvel appel',
    startCallText: 'Démarrer la conversation',
    endCallText: 'Terminer la conversation',
    listeningText: 'J\'écoute…',
    speakingText: 'L\'agent vous parle',
    variant: 'expanded'
  });
  const [error, setError] = useState<string | null>(null);
  
  const { toast } = useToast();
  const { user } = useAuth();

  const extractAgentId = (code: string): string | null => {
    // Rechercher l'agent-id dans le code d'intégration
    const agentIdMatch = code.match(/agent-id="([^"]+)"/);
    return agentIdMatch ? agentIdMatch[1] : null;
  };

  const validateIntegrationCode = () => {
    const extractedId = extractAgentId(integrationCode);
    
    if (!extractedId) {
      setError('Code d\'intégration invalide. Veuillez vérifier que le code contient un agent-id.');
      return false;
    }
    
    if (!extractedId.startsWith('agent_')) {
      setError('L\'agent-id doit commencer par "agent_"');
      return false;
    }
    
    setAgentId(extractedId);
    setError(null);
    return true;
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!integrationCode.trim()) {
        setError('Veuillez coller votre code d\'intégration ElevenLabs');
        return;
      }
      
      if (validateIntegrationCode()) {
        setStep(2);
      }
    } else if (step === 2) {
      if (!agentName.trim()) {
        setError('Veuillez donner un nom à votre agent');
        return;
      }
      setStep(3);
    }
  };

  const handleCreateAgent = async () => {
    if (!user?.id) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté pour créer un agent",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Créer ou récupérer le bot_owner
      let { data: botOwner } = await supabase
        .from('bot_owners')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!botOwner) {
        const { data: newBotOwner, error: ownerError } = await supabase
          .from('bot_owners')
          .insert([{
            user_id: user.id,
            subscription_plan: 'free',
            max_bots: 5
          }])
          .select('id')
          .single();

        if (ownerError) throw ownerError;
        botOwner = newBotOwner;
      }

      // Créer le bot avec l'agent ElevenLabs
      const { data: bot, error: botError } = await supabase
        .from('bots')
        .insert([{
          owner_id: botOwner.id,
          name: agentName,
          description: `Agent IA personnel créé à partir d'ElevenLabs`,
          elevenlabs_agent_id: agentId,
          widget_config: widgetConfig as any,
          is_personal_agent: true,
          is_active: true,
          share_enabled: true
        }])
        .select('*')
        .single();

      if (botError) throw botError;

      toast({
        title: "Agent créé avec succès !",
        description: `Votre agent "${agentName}" est maintenant disponible`
      });

      onAgentCreated();
      onClose();
      setStep(1);
      setIntegrationCode('');
      setAgentName('');
      setAgentId('');
    } catch (error: any) {
      console.error('Erreur lors de la création de l\'agent:', error);
      setError(error.message || 'Erreur lors de la création de l\'agent');
    } finally {
      setIsLoading(false);
    }
  };

  const generateWidgetCode = () => {
    return `<elevenlabs-convai
  agent-id="${agentId}"
  variant="${widgetConfig.variant}"
  action-text="${widgetConfig.actionText}"
  start-call-text="${widgetConfig.startCallText}"
  end-call-text="${widgetConfig.endCallText}"
  listening-text="${widgetConfig.listeningText}"
  speaking-text="${widgetConfig.speakingText}"
></elevenlabs-convai>
<script src="https://unpkg.com/@elevenlabs/convai-widget-embed" async type="text/javascript"></script>`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copié !",
      description: "Le code a été copié dans le presse-papier"
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Créer mon agent IA personnel</DialogTitle>
          <DialogDescription>
            Créez votre propre agent de conversation en utilisant votre code d'intégration ElevenLabs
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Indicateur d'étapes */}
          <div className="flex items-center justify-center space-x-4">
            {[1, 2, 3].map((num) => (
              <div key={num} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= num ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  {step > num ? <CheckCircle className="w-4 h-4" /> : num}
                </div>
                {num < 3 && <div className={`w-12 h-0.5 ${step > num ? 'bg-primary' : 'bg-muted'}`} />}
              </div>
            ))}
          </div>

          {/* Étape 1: Code d'intégration */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm">1</span>
                  Code d'intégration ElevenLabs
                </CardTitle>
                <CardDescription>
                  Collez votre code d'intégration ElevenLabs pour extraire l'agent-id
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="integration-code">Code d'intégration</Label>
                  <Textarea
                    id="integration-code"
                    placeholder={`<elevenlabs-convai agent-id="agent_xxxxxxxxxxxxx"></elevenlabs-convai>
<script src="https://unpkg.com/@elevenlabs/convai-widget-embed" async type="text/javascript"></script>`}
                    value={integrationCode}
                    onChange={(e) => setIntegrationCode(e.target.value)}
                    className="min-h-[100px] font-mono text-sm"
                  />
                </div>
                
                {agentId && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle className="w-4 h-4" />
                      <span className="font-medium">Agent ID détecté:</span>
                      <Badge variant="outline" className="font-mono">{agentId}</Badge>
                    </div>
                  </div>
                )}

                <div className="text-sm text-muted-foreground">
                  <p><strong>Où trouver votre code ?</strong></p>
                  <ol className="list-decimal list-inside space-y-1 mt-2">
                    <li>Connectez-vous à votre compte ElevenLabs</li>
                    <li>Allez dans la section "ConvAI"</li>
                    <li>Sélectionnez votre agent</li>
                    <li>Copiez le code d'intégration fourni</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Étape 2: Configuration */}
          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm">2</span>
                  Configuration de l'agent
                </CardTitle>
                <CardDescription>
                  Personnalisez les textes et l'apparence de votre agent
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="agent-name">Nom de l'agent</Label>
                  <Input
                    id="agent-name"
                    placeholder="Mon assistant personnel"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="action-text">Texte du bouton</Label>
                    <Input
                      id="action-text"
                      value={widgetConfig.actionText}
                      onChange={(e) => setWidgetConfig({...widgetConfig, actionText: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="start-call-text">Démarrer la conversation</Label>
                    <Input
                      id="start-call-text"
                      value={widgetConfig.startCallText}
                      onChange={(e) => setWidgetConfig({...widgetConfig, startCallText: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="end-call-text">Terminer la conversation</Label>
                    <Input
                      id="end-call-text"
                      value={widgetConfig.endCallText}
                      onChange={(e) => setWidgetConfig({...widgetConfig, endCallText: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="listening-text">Texte d'écoute</Label>
                    <Input
                      id="listening-text"
                      value={widgetConfig.listeningText}
                      onChange={(e) => setWidgetConfig({...widgetConfig, listeningText: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="speaking-text">Texte de parole</Label>
                  <Input
                    id="speaking-text"
                    value={widgetConfig.speakingText}
                    onChange={(e) => setWidgetConfig({...widgetConfig, speakingText: e.target.value})}
                  />
                </div>

                <div>
                  <Label>Variante du widget</Label>
                  <div className="flex gap-2 mt-2">
                    <Button
                      variant={widgetConfig.variant === 'compact' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setWidgetConfig({...widgetConfig, variant: 'compact'})}
                    >
                      Compact
                    </Button>
                    <Button
                      variant={widgetConfig.variant === 'expanded' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setWidgetConfig({...widgetConfig, variant: 'expanded'})}
                    >
                      Étendu
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Étape 3: Aperçu et confirmation */}
          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm">3</span>
                  Aperçu et confirmation
                </CardTitle>
                <CardDescription>
                  Vérifiez la configuration avant de créer votre agent
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Informations de l'agent</h4>
                    <div className="space-y-2 text-sm">
                      <div><strong>Nom:</strong> {agentName}</div>
                      <div><strong>Agent ID:</strong> <code className="bg-muted px-1 rounded">{agentId}</code></div>
                      <div><strong>Variante:</strong> {widgetConfig.variant}</div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Textes personnalisés</h4>
                    <div className="space-y-2 text-sm">
                      <div><strong>Bouton:</strong> "{widgetConfig.actionText}"</div>
                      <div><strong>Démarrer:</strong> "{widgetConfig.startCallText}"</div>
                      <div><strong>Terminer:</strong> "{widgetConfig.endCallText}"</div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Code généré</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(generateWidgetCode())}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copier
                    </Button>
                  </div>
                  <Textarea
                    value={generateWidgetCode()}
                    readOnly
                    className="font-mono text-xs bg-muted"
                    rows={8}
                  />
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-700">
                      <p className="font-medium mb-1">Une fois créé, vous pourrez :</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Utiliser votre agent sur la page Kpakpato</li>
                        <li>Intégrer le widget sur votre site web</li>
                        <li>Modifier la configuration à tout moment</li>
                        <li>Voir les statistiques d'utilisation</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <div>
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                Précédent
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
            {step < 3 ? (
              <Button onClick={handleNextStep}>
                Suivant
              </Button>
            ) : (
              <Button onClick={handleCreateAgent} disabled={isLoading}>
                {isLoading ? 'Création...' : 'Créer l\'agent'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};