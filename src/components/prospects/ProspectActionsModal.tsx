import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Mail, 
  Phone, 
  MessageSquare,
  Tag,
  Target,
  Calendar,
  Filter,
  Download,
  Upload,
  Users,
  BarChart3,
  Settings,
  Zap,
  Clock,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProspectActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProspects?: string[];
}

export const ProspectActionsModal: React.FC<ProspectActionsModalProps> = ({
  isOpen,
  onClose,
  selectedProspects = []
}) => {
  const [activeTab, setActiveTab] = useState('bulk');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleAction = async (actionName: string) => {
    setIsProcessing(true);
    
    try {
      // Simuler l'action
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Action terminée",
        description: `${actionName} a été exécutée avec succès.`,
      });
      
      onClose();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'effectuer l'action.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const bulkActions = [
    {
      id: 'email-campaign',
      title: 'Campagne Email',
      description: 'Créer une campagne email personnalisée',
      icon: Mail,
      color: 'blue',
      category: 'Communication'
    },
    {
      id: 'sms-campaign',
      title: 'Campagne SMS',
      description: 'Envoyer des SMS en masse',
      icon: MessageSquare,
      color: 'green',
      category: 'Communication'
    },
    {
      id: 'phone-sequence',
      title: 'Séquence d\'appels',
      description: 'Planifier des appels de suivi',
      icon: Phone,
      color: 'purple',
      category: 'Communication'
    },
    {
      id: 'tag-management',
      title: 'Gestion des tags',
      description: 'Ajouter ou modifier des étiquettes',
      icon: Tag,
      color: 'orange',
      category: 'Organisation'
    },
    {
      id: 'status-update',
      title: 'Mise à jour statut',
      description: 'Changer le statut en lot',
      icon: Target,
      color: 'indigo',
      category: 'Qualification'
    },
    {
      id: 'schedule-followup',
      title: 'Planifier suivi',
      description: 'Programmer des rappels automatiques',
      icon: Calendar,
      color: 'pink',
      category: 'Planification'
    }
  ];

  const automationActions = [
    {
      id: 'auto-qualify',
      title: 'Qualification automatique',
      description: 'IA analyse et qualifie automatiquement',
      icon: Zap,
      color: 'yellow'
    },
    {
      id: 'follow-up-sequence',
      title: 'Séquence de suivi',
      description: 'Automatiser les relances selon le comportement',
      icon: Clock,
      color: 'teal'
    },
    {
      id: 'lead-scoring',
      title: 'Scoring intelligent',
      description: 'Mise à jour automatique des scores',
      icon: BarChart3,
      color: 'purple'
    }
  ];

  const managementActions = [
    {
      id: 'export-advanced',
      title: 'Export avancé',
      description: 'Export personnalisé avec filtres',
      icon: Download,
      color: 'blue'
    },
    {
      id: 'import-data',
      title: 'Import de données',
      description: 'Importer depuis fichier ou CRM',
      icon: Upload,
      color: 'green'
    },
    {
      id: 'duplicate-detection',
      title: 'Détection doublons',
      description: 'Identifier et fusionner les doublons',
      icon: AlertCircle,
      color: 'red'
    }
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'border-blue-200 hover:border-blue-300 hover:bg-blue-50',
      green: 'border-green-200 hover:border-green-300 hover:bg-green-50',
      purple: 'border-purple-200 hover:border-purple-300 hover:bg-purple-50',
      orange: 'border-orange-200 hover:border-orange-300 hover:bg-orange-50',
      indigo: 'border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50',
      pink: 'border-pink-200 hover:border-pink-300 hover:bg-pink-50',
      yellow: 'border-yellow-200 hover:border-yellow-300 hover:bg-yellow-50',
      teal: 'border-teal-200 hover:border-teal-300 hover:bg-teal-50',
      red: 'border-red-200 hover:border-red-300 hover:bg-red-50',
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center">
            <Settings className="w-6 h-6 mr-2" />
            Centre d'Actions Prospects
          </DialogTitle>
          <DialogDescription>
            Effectuez des actions en lot et gérez vos prospects de manière avancée
            {selectedProspects.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {selectedProspects.length} sélectionné(s)
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="bulk" className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>Actions en lot</span>
            </TabsTrigger>
            <TabsTrigger value="automation" className="flex items-center space-x-2">
              <Zap className="w-4 h-4" />
              <span>Automatisation</span>
            </TabsTrigger>
            <TabsTrigger value="management" className="flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span>Gestion</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bulk" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Actions en lot
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {bulkActions.map((action) => (
                    <Card 
                      key={action.id}
                      className={`cursor-pointer transition-all duration-200 ${getColorClasses(action.color)}`}
                      onClick={() => handleAction(action.title)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          <div className="p-2 rounded-lg bg-white border">
                            <action.icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium mb-1">{action.title}</h3>
                            <p className="text-sm text-muted-foreground mb-2">
                              {action.description}
                            </p>
                            <Badge variant="outline" className="text-xs">
                              {action.category}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="automation" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="w-5 h-5 mr-2" />
                  Automatisation intelligente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {automationActions.map((action) => (
                    <Card 
                      key={action.id}
                      className={`cursor-pointer transition-all duration-200 ${getColorClasses(action.color)}`}
                      onClick={() => handleAction(action.title)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          <div className="p-2 rounded-lg bg-white border">
                            <action.icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium mb-1">{action.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {action.description}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <Zap className="w-5 h-5 text-blue-600" />
                    <h4 className="font-medium text-blue-900">Automatisation IA</h4>
                  </div>
                  <p className="text-sm text-blue-700">
                    Les actions d'automatisation utilisent l'intelligence artificielle pour optimiser 
                    vos processus de qualification et de suivi des prospects.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="management" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="w-5 h-5 mr-2" />
                  Gestion des données
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {managementActions.map((action) => (
                    <Card 
                      key={action.id}
                      className={`cursor-pointer transition-all duration-200 ${getColorClasses(action.color)}`}
                      onClick={() => handleAction(action.title)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          <div className="p-2 rounded-lg bg-white border">
                            <action.icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium mb-1">{action.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {action.description}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
          <Button 
            onClick={() => handleAction('Exécution en lot')}
            disabled={isProcessing}
          >
            {isProcessing && <Clock className="w-4 h-4 mr-2 animate-spin" />}
            Exécuter les actions sélectionnées
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};