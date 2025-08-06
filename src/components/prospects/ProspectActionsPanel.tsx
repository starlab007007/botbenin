import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Mail, 
  Phone, 
  MessageSquare,
  Users,
  Download,
  Upload,
  Filter,
  Calendar,
  Tag,
  Target,
  BarChart3,
  FileText,
  Share2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProspectActionsPanelProps {
  selectedProspects: string[];
  onExport: () => void;
  onCreateCampaign: () => void;
  onClearSelection: () => void;
}

export const ProspectActionsPanel: React.FC<ProspectActionsPanelProps> = ({
  selectedProspects,
  onExport,
  onCreateCampaign,
  onClearSelection
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleBulkAction = async (action: string) => {
    setIsProcessing(true);
    
    try {
      // Simuler l'action
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: "Action terminée",
        description: `${action} appliquée à ${selectedProspects.length} prospect(s).`,
      });
      
      onClearSelection();
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
      id: 'email',
      label: 'Email en lot',
      icon: Mail,
      description: 'Envoyer un email personnalisé',
      color: 'blue'
    },
    {
      id: 'sms',
      label: 'SMS en lot',
      icon: MessageSquare,
      description: 'Envoyer un SMS groupé',
      color: 'green'
    },
    {
      id: 'tag',
      label: 'Ajouter tags',
      icon: Tag,
      description: 'Organiser avec des étiquettes',
      color: 'purple'
    },
    {
      id: 'qualify',
      label: 'Qualifier',
      icon: Target,
      description: 'Marquer comme qualifiés',
      color: 'orange'
    },
    {
      id: 'schedule',
      label: 'Planifier suivi',
      icon: Calendar,
      description: 'Programmer un rappel',
      color: 'indigo'
    },
    {
      id: 'report',
      label: 'Générer rapport',
      icon: FileText,
      description: 'Créer un rapport détaillé',
      color: 'gray'
    }
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'border-blue-200 hover:border-blue-300 hover:bg-blue-50 text-blue-700',
      green: 'border-green-200 hover:border-green-300 hover:bg-green-50 text-green-700',
      purple: 'border-purple-200 hover:border-purple-300 hover:bg-purple-50 text-purple-700',
      orange: 'border-orange-200 hover:border-orange-300 hover:bg-orange-50 text-orange-700',
      indigo: 'border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50 text-indigo-700',
      gray: 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700',
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  if (selectedProspects.length === 0) {
    return (
      <Card className="mb-6">
        <CardContent className="p-6 text-center">
          <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Actions en lot</h3>
          <p className="text-muted-foreground">
            Sélectionnez des prospects pour accéder aux actions en lot.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6 border-primary/20 bg-primary/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">
              Actions en lot
            </CardTitle>
            <Badge variant="secondary">
              {selectedProspects.length} sélectionné(s)
            </Badge>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClearSelection}
          >
            Désélectionner tout
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Actions principales */}
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={onCreateCampaign}
            disabled={isProcessing}
          >
            <Mail className="w-4 h-4 mr-2" />
            Nouvelle campagne
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={onExport}
            disabled={isProcessing}
          >
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleBulkAction('Changement de statut')}
            disabled={isProcessing}
          >
            <Target className="w-4 h-4 mr-2" />
            Changer statut
          </Button>
        </div>

        {/* Actions avancées */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {bulkActions.map((action) => (
            <Card 
              key={action.id}
              className={`cursor-pointer transition-all duration-200 ${getColorClasses(action.color)}`}
              onClick={() => handleBulkAction(action.label)}
            >
              <CardContent className="p-3 text-center">
                <action.icon className="w-6 h-6 mx-auto mb-2" />
                <div className="text-xs font-medium mb-1">
                  {action.label}
                </div>
                <div className="text-xs text-muted-foreground">
                  {action.description}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Statistiques rapides */}
        <div className="bg-white rounded-lg p-4 border">
          <h4 className="text-sm font-medium mb-3">Aperçu de la sélection</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-blue-600">
                {Math.round(selectedProspects.length * 0.7)}
              </div>
              <div className="text-xs text-muted-foreground">Avec email</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-green-600">
                {Math.round(selectedProspects.length * 0.5)}
              </div>
              <div className="text-xs text-muted-foreground">Avec téléphone</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-purple-600">
                {Math.round(selectedProspects.length * 0.3)}
              </div>
              <div className="text-xs text-muted-foreground">Qualifiés</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-orange-600">
                {Math.round(selectedProspects.length * 0.15)}
              </div>
              <div className="text-xs text-muted-foreground">Convertis</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};