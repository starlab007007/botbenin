import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Bot, MoreVertical, Play, Pause, Copy, Link, Share2, QrCode, ExternalLink, Settings, Trash2 } from 'lucide-react';
import { usePersonalAgents } from '@/hooks/usePersonalAgents';
import { useToast } from '@/hooks/use-toast';
import { AgentWidgetDisplay } from './AgentWidgetDisplay';

interface AgentWidgetManagerProps {
  open: boolean;
  onClose: () => void;
}

export const AgentWidgetManager: React.FC<AgentWidgetManagerProps> = ({ open, onClose }) => {
  const { agents, activeAgent, selectAgent, deleteAgent, updateAgent } = usePersonalAgents();
  const { toast } = useToast();
  const [selectedAgentForWidget, setSelectedAgentForWidget] = useState<any>(null);
  const [generatingShareUrl, setGeneratingShareUrl] = useState<string | null>(null);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const generateWidgetCode = (agent: any) => {
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

  const generateWidgetUrl = (agent: any) => {
    return `${window.location.origin}/widget?agent=${agent.id}`;
  };

  const copyWidgetCode = (agent: any) => {
    navigator.clipboard.writeText(generateWidgetCode(agent));
    toast({
      title: "Code widget copié !",
      description: "Le code d'intégration du widget a été copié dans le presse-papier"
    });
  };

  const copyWidgetUrl = async (agent: any) => {
    setGeneratingShareUrl(agent.id);
    try {
      const widgetUrl = generateWidgetUrl(agent);
      await navigator.clipboard.writeText(widgetUrl);
      toast({
        title: "URL du widget copiée !",
        description: "L'URL du widget a été copiée dans le presse-papier"
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de copier l'URL du widget",
        variant: "destructive"
      });
    } finally {
      setGeneratingShareUrl(null);
    }
  };

  const shareWidgetOnWhatsApp = (agent: any) => {
    const widgetUrl = generateWidgetUrl(agent);
    const message = `🤖 Découvrez ${agent.name} - Mon agent IA conversationnel personnalisé !\n\nCliquez pour interagir directement : ${widgetUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const openWidgetInNewTab = (agent: any) => {
    const widgetUrl = generateWidgetUrl(agent);
    window.open(widgetUrl, '_blank');
  };

  const toggleAgentStatus = async (agent: any) => {
    await updateAgent(agent.id, { 
      ...agent, 
      is_active: !agent.is_active 
    });
  };

  const handleSelectAgent = (agent: any) => {
    selectAgent(agent);
    toast({
      title: "Widget activé",
      description: `Le widget de ${agent.name} est maintenant actif sur cette page`
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              Gestionnaire de Widgets d'Agents IA
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {agents.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Bot className="w-16 h-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-medium mb-2">Aucun agent disponible</h3>
                  <p className="text-muted-foreground mb-4">
                    Créez votre premier agent IA pour générer des widgets personnalisés.
                  </p>
                  <Button onClick={onClose}>
                    Créer mon premier agent
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {agents.map((agent) => (
                    <Card key={agent.id} className={`relative transition-all hover:shadow-lg ${
                      activeAgent?.id === agent.id ? 'ring-2 ring-primary shadow-primary/20' : ''
                    }`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg flex items-center gap-2">
                              {agent.name}
                              {activeAgent?.id === agent.id && (
                                <Badge variant="default" className="text-xs">
                                  Widget Actif
                                </Badge>
                              )}
                            </CardTitle>
                            <CardDescription className="mt-1">
                              <div className="space-y-1">
                                <div>Agent ID: <code className="text-xs bg-muted px-1 rounded">
                                  {agent.elevenlabs_agent_id.slice(0, 20)}...
                                </code></div>
                                <div>Variante: <span className="capitalize">{agent.widget_config?.variant}</span></div>
                              </div>
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={agent.is_active ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {agent.is_active ? 'Activé' : 'Désactivé'}
                            </Badge>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setSelectedAgentForWidget(agent)}>
                                  <Play className="w-4 h-4 mr-2" />
                                  Prévisualiser le widget
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleSelectAgent(agent)}>
                                  <Settings className="w-4 h-4 mr-2" />
                                  Activer sur cette page
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openWidgetInNewTab(agent)}>
                                  <ExternalLink className="w-4 h-4 mr-2" />
                                  Ouvrir dans un nouvel onglet
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => copyWidgetCode(agent)}>
                                  <Copy className="w-4 h-4 mr-2" />
                                  Copier le code d'intégration
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => copyWidgetUrl(agent)}
                                  disabled={generatingShareUrl === agent.id}
                                >
                                  <Link className="w-4 h-4 mr-2" />
                                  Copier l'URL du widget
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => shareWidgetOnWhatsApp(agent)}>
                                  <Share2 className="w-4 h-4 mr-2" />
                                  Partager sur WhatsApp
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => toggleAgentStatus(agent)}>
                                  {agent.is_active ? (
                                    <>
                                      <Pause className="w-4 h-4 mr-2" />
                                      Désactiver
                                    </>
                                  ) : (
                                    <>
                                      <Play className="w-4 h-4 mr-2" />
                                      Activer
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem 
                                      className="text-red-600"
                                      onSelect={(e) => e.preventDefault()}
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Supprimer
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Supprimer l'agent</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Êtes-vous sûr de vouloir supprimer l'agent "{agent.name}" ?
                                        Cette action supprimera définitivement le widget et toutes ses configurations.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                                      <AlertDialogAction 
                                        onClick={() => deleteAgent(agent.id)}
                                        className="bg-red-600 hover:bg-red-700"
                                      >
                                        Supprimer
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Créé le:</span>
                              <span className="ml-1">{formatDate(agent.created_at)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Configuration:</span>
                              <div className="ml-1 text-xs text-muted-foreground mt-1">
                                <div>• Bouton: "{agent.widget_config?.actionText}"</div>
                                <div>• Démarrer: "{agent.widget_config?.startCallText}"</div>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => copyWidgetCode(agent)}
                              className="text-xs"
                            >
                              <Copy className="w-3 h-3 mr-1" />
                              Code
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => copyWidgetUrl(agent)}
                              disabled={generatingShareUrl === agent.id}
                              className="text-xs"
                            >
                              <Link className="w-3 h-3 mr-1" />
                              URL
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => shareWidgetOnWhatsApp(agent)}
                              className="text-xs"
                            >
                              <Share2 className="w-3 h-3 mr-1" />
                              WhatsApp
                            </Button>
                            <Button 
                              size="sm"
                              onClick={() => setSelectedAgentForWidget(agent)}
                              className="text-xs"
                            >
                              <Play className="w-3 h-3 mr-1" />
                              Démarrer mon agent IA
                            </Button>
                          </div>

                          {activeAgent?.id !== agent.id && (
                            <Button 
                              size="sm"
                              onClick={() => handleSelectAgent(agent)}
                              className="w-full"
                              variant="default"
                            >
                              <Settings className="w-4 h-4 mr-2" />
                              Activer ce widget
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de prévisualisation du widget */}
      {selectedAgentForWidget && (
        <AgentWidgetDisplay
          agent={selectedAgentForWidget}
          open={!!selectedAgentForWidget}
          onClose={() => setSelectedAgentForWidget(null)}
        />
      )}
    </>
  );
};