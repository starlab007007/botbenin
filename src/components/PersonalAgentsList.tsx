import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Bot, MoreVertical, Settings, Trash2, Copy, Play, Pause, Share2, Link, QrCode } from 'lucide-react';
import { usePersonalAgents } from '@/hooks/usePersonalAgents';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface PersonalAgentsListProps {
  open: boolean;
  onClose: () => void;
}

export const PersonalAgentsList: React.FC<PersonalAgentsListProps> = ({ open, onClose }) => {
  const { agents, activeAgent, selectAgent, deleteAgent, updateAgent } = usePersonalAgents();
  const { toast } = useToast();
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
    return `<elevenlabs-convai
  agent-id="${agent.elevenlabs_agent_id}"
  variant="${config.variant}"
  action-text="${config.actionText}"
  start-call-text="${config.startCallText}"
  end-call-text="${config.endCallText}"
  listening-text="${config.listeningText}"
  speaking-text="${config.speakingText}"
></elevenlabs-convai>
<script src="https://unpkg.com/@elevenlabs/convai-widget-embed" async type="text/javascript"></script>`;
  };

  const copyWidgetCode = (agent: any) => {
    navigator.clipboard.writeText(generateWidgetCode(agent));
    toast({
      title: "Code copié !",
      description: "Le code d'intégration a été copié dans le presse-papier"
    });
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
      title: "Agent sélectionné",
      description: `${agent.name} est maintenant votre agent actif`
    });
  };

  const createShareUrl = async (agent: any) => {
    setGeneratingShareUrl(agent.id);
    try {
      // Pour les agents personnels, on génère un lien vers la page widget
      const shareUrl = `${window.location.origin}/widget?agent=${agent.id}`;
      
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Lien copié !",
        description: "Le lien de partage de votre agent a été copié dans le presse-papier"
      });
    } catch (error) {
      console.error('Erreur lors de la création du lien:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer le lien de partage",
        variant: "destructive"
      });
    } finally {
      setGeneratingShareUrl(null);
    }
  };

  const shareOnWhatsApp = (agent: any) => {
    const shareUrl = `${window.location.origin}/widget?agent=${agent.id}`;
    const message = `Découvrez ${agent.name} - Mon agent IA de conversation personnalisé ! 🤖✨ ${shareUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            Mes agents IA personnels
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {agents.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Bot className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Aucun agent personnel</h3>
                <p className="text-muted-foreground mb-4">
                  Vous n'avez pas encore créé d'agent IA personnel.
                </p>
                <Button onClick={onClose}>
                  Créer mon premier agent
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {agents.map((agent) => (
                <Card key={agent.id} className={`relative ${
                  activeAgent?.id === agent.id ? 'ring-2 ring-primary' : ''
                }`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{agent.name}</CardTitle>
                        <CardDescription className="mt-1">
                          Agent ID: <code className="text-xs bg-muted px-1 rounded">
                            {agent.elevenlabs_agent_id}
                          </code>
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {activeAgent?.id === agent.id && (
                          <Badge variant="default" className="text-xs">
                            Actif
                          </Badge>
                        )}
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
                            <DropdownMenuItem onClick={() => handleSelectAgent(agent)}>
                              <Play className="w-4 h-4 mr-2" />
                              Utiliser cet agent
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => copyWidgetCode(agent)}>
                              <Copy className="w-4 h-4 mr-2" />
                              Copier le code d'intégration
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => createShareUrl(agent)}
                              disabled={generatingShareUrl === agent.id}
                            >
                              <Link className="w-4 h-4 mr-2" />
                              Copier le lien de partage
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => shareOnWhatsApp(agent)}>
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
                                    Cette action est irréversible.
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
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Variante:</span>
                          <span className="ml-1 capitalize">{agent.widget_config?.variant}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Créé:</span>
                          <span className="ml-1">{formatDate(agent.created_at)}</span>
                        </div>
                      </div>
                      
                      <div className="text-xs text-muted-foreground">
                        <strong>Textes personnalisés:</strong>
                        <div className="mt-1 space-y-1">
                          <div>Bouton: "{agent.widget_config?.actionText}"</div>
                          <div>Démarrer: "{agent.widget_config?.startCallText}"</div>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <div className="flex gap-1 flex-1">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => copyWidgetCode(agent)}
                            className="flex-1 text-xs"
                          >
                            <Copy className="w-3 h-3 mr-1" />
                            Code
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => createShareUrl(agent)}
                            disabled={generatingShareUrl === agent.id}
                            className="flex-1 text-xs"
                          >
                            <Link className="w-3 h-3 mr-1" />
                            Lien
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => shareOnWhatsApp(agent)}
                            className="flex-1 text-xs"
                          >
                            <Share2 className="w-3 h-3 mr-1" />
                            WA
                          </Button>
                        </div>
                        {activeAgent?.id !== agent.id && (
                          <Button 
                            size="sm"
                            onClick={() => handleSelectAgent(agent)}
                            className="px-3"
                          >
                            <Play className="w-4 h-4 mr-1" />
                            Utiliser
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};