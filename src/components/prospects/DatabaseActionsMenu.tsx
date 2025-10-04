import React, { useState } from 'react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { 
  Plus,
  Copy,
  Archive,
  Trash2,
  Share2,
  Settings,
  Download,
  Upload,
  BarChart3,
  FileSpreadsheet
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ProspectDatabase, useProspectDatabases } from '@/hooks/useProspectDatabases';

interface DatabaseActionsMenuProps {
  database: ProspectDatabase;
  onExport: () => void;
  onEdit: () => void;
  onRefresh?: () => void;
}

export const DatabaseActionsMenu: React.FC<DatabaseActionsMenuProps> = ({ 
  database,
  onExport,
  onEdit,
  onRefresh
}) => {
  const { toast } = useToast();
  const { deleteDatabase } = useProspectDatabases();

  const handleDuplicate = () => {
    toast({
      title: "Fonctionnalité en développement",
      description: `La duplication de "${database.name}" sera bientôt disponible.`,
    });
  };

  const handleArchive = () => {
    toast({
      title: "Fonctionnalité en développement",
      description: `L'archivage de "${database.name}" sera bientôt disponible.`,
    });
  };

  const handleShare = () => {
    toast({
      title: "Fonctionnalité en développement",
      description: `Le partage de "${database.name}" sera bientôt disponible.`,
    });
  };

  const handleImport = () => {
    toast({
      title: "Fonctionnalité en développement",
      description: "L'import de prospects sera bientôt disponible.",
    });
  };

  const handleAnalytics = () => {
    toast({
      title: "Fonctionnalité en développement",
      description: "Les analyses détaillées seront bientôt disponibles.",
    });
  };

  const handleDelete = async () => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer "${database.name}" ? Cette action est irréversible.`)) {
      return;
    }

    try {
      await deleteDatabase(database.id);
      toast({
        title: "Base supprimée",
        description: `La base "${database.name}" a été supprimée avec succès.`,
      });
      onRefresh?.();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la base de données.",
        variant: "destructive"
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 mr-1" />
          Actions
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Actions sur la base</DropdownMenuLabel>
        
        <DropdownMenuItem onClick={onEdit}>
          <Settings className="w-4 h-4 mr-2" />
          Paramètres
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleAnalytics}>
          <BarChart3 className="w-4 h-4 mr-2" />
          Analyses détaillées
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleImport}>
          <Upload className="w-4 h-4 mr-2" />
          Importer des prospects
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={onExport}>
          <Download className="w-4 h-4 mr-2" />
          Exporter les données
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleDuplicate}>
          <Copy className="w-4 h-4 mr-2" />
          Dupliquer la base
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleShare}>
          <Share2 className="w-4 h-4 mr-2" />
          Partager
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleArchive}>
          <Archive className="w-4 h-4 mr-2" />
          Archiver
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={handleDelete}
          className="text-red-600 focus:text-red-600"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Supprimer la base
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};