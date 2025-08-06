import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  BarChart3, 
  Mail, 
  Download, 
  Plus,
  Settings
} from 'lucide-react';
import { useProspects } from '@/hooks/useProspects';

interface ProspectTopActionsProps {
  activeView: string;
  onViewChange: (view: string) => void;
  onCampaignOpen: () => void;
  onExportOpen: () => void;
  onActionsOpen: () => void;
  onCreateProspect: () => void;
  searchTerm: string;
}

export const ProspectTopActions: React.FC<ProspectTopActionsProps> = ({
  activeView,
  onViewChange,
  onCampaignOpen,
  onExportOpen,
  onActionsOpen,
  onCreateProspect,
  searchTerm
}) => {
  const { prospects, stats } = useProspects({ searchTerm });

  return (
    <Card className="mb-6 border-primary/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          {/* Partie gauche - Navigation principale */}
          <div className="flex items-center space-x-1">
            <div className="flex items-center space-x-2 mr-4">
              <Users className="w-5 h-5 text-muted-foreground" />
              <span className="text-lg font-medium">{stats.totalProspects}</span>
              <span className="text-muted-foreground">Voir prospects</span>
            </div>
            
            <Button
              variant={activeView === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onViewChange('list')}
              className="rounded-full"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Gérer
            </Button>
          </div>

          {/* Partie droite - Actions rapides */}
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onCampaignOpen}
              className="flex items-center space-x-2"
            >
              <Mail className="w-4 h-4" />
              <span>Campagne</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onExportOpen}
              className="flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onActionsOpen}
              className="flex items-center space-x-2"
            >
              <Settings className="w-4 h-4" />
              <span>Actions</span>
            </Button>

            <div className="h-6 w-px bg-border mx-2" />
            
            <Button
              size="sm"
              onClick={onCreateProspect}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Ajouter
            </Button>
          </div>
        </div>

        {/* Indicateurs de statut */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                {stats.newProspects} Nouveaux
              </Badge>
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                {stats.contactedProspects} Contactés
              </Badge>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                {stats.qualifiedProspects} Qualifiés
              </Badge>
              <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                {stats.convertedProspects} Convertis
              </Badge>
            </div>
          </div>
          
          <div className="text-sm text-muted-foreground">
            Score moyen: <span className="font-medium">{stats.avgScore}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};