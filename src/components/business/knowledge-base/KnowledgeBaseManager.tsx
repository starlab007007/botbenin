import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  ArrowLeft, 
  MoreVertical, 
  Edit, 
  Bot, 
  Download, 
  Trash2, 
  Plus,
  Database,
  Sparkles
} from 'lucide-react';
import { useKnowledgeBases } from '@/hooks/useKnowledgeBases';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface KnowledgeBaseManagerProps {
  onBack: () => void;
  onCreateNew: () => void;
}

export const KnowledgeBaseManager: React.FC<KnowledgeBaseManagerProps> = ({ 
  onBack, 
  onCreateNew 
}) => {
  const { knowledgeBases, loading, deleteKnowledgeBase, exportKnowledgeBase } = useKnowledgeBases();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedKbId, setSelectedKbId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (selectedKbId) {
      await deleteKnowledgeBase(selectedKbId);
      setDeleteDialogOpen(false);
      setSelectedKbId(null);
    }
  };

  const getSectorColor = (sector: string) => {
    const colors: Record<string, string> = {
      restaurant: 'bg-orange-100 text-orange-700 border-orange-300',
      hotel: 'bg-blue-100 text-blue-700 border-blue-300',
      real_estate: 'bg-green-100 text-green-700 border-green-300',
      ecommerce: 'bg-purple-100 text-purple-700 border-purple-300',
      training: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      university: 'bg-cyan-100 text-cyan-700 border-cyan-300',
      clinic: 'bg-red-100 text-red-700 border-red-300'
    };
    return colors[sector] || 'bg-gray-100 text-gray-700 border-gray-300';
  };

  const getSectorLabel = (sector: string) => {
    const labels: Record<string, string> = {
      restaurant: 'Restauration',
      hotel: 'Hôtellerie',
      real_estate: 'Immobilier',
      ecommerce: 'E-commerce',
      training: 'Formation',
      university: 'Université',
      clinic: 'Clinique'
    };
    return labels[sector] || sector;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Chargement...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Mes Bases de Connaissances</h1>
              <p className="text-muted-foreground">
                Gérez vos bases de données pour l'entraînement de vos bots IA
              </p>
            </div>
          </div>
          <Button onClick={onCreateNew} size="lg">
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle Base
          </Button>
        </div>

        {knowledgeBases.length === 0 ? (
          <Card className="p-12">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto">
                <Database className="w-10 h-10 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Aucune base de connaissances</h3>
                <p className="text-muted-foreground mb-6">
                  Créez votre première base de connaissances pour entraîner vos bots IA avec vos données métier
                </p>
                <Button onClick={onCreateNew} size="lg">
                  <Plus className="w-4 h-4 mr-2" />
                  Créer ma première base
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {knowledgeBases.map((kb) => (
              <Card key={kb.id} className="hover:shadow-lg transition-all">
                <CardHeader>
                  <div className="flex items-center justify-between mb-3">
                    <Badge className={getSectorColor(kb.sector)}>
                      {getSectorLabel(kb.sector)}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Edit className="w-4 h-4 mr-2" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => exportKnowledgeBase(kb, 'json')}>
                          <Download className="w-4 h-4 mr-2" />
                          Exporter
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => {
                            setSelectedKbId(kb.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CardTitle className="text-lg line-clamp-1">{kb.name}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {kb.description || 'Base de connaissances'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Complétion</span>
                      <span className="font-medium">{kb.completion_percentage}%</span>
                    </div>
                    <Progress value={kb.completion_percentage} className="h-2" />
                  </div>

                  {kb.bot_id && (
                    <Badge variant="default" className="w-full justify-center">
                      <Bot className="w-3 h-3 mr-1" />
                      Bot actif
                    </Badge>
                  )}

                  <div className="text-xs text-muted-foreground pt-2 border-t">
                    Modifié le {format(new Date(kb.updated_at), 'dd MMM yyyy', { locale: fr })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-0">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-2">Conseil : Entraînement de bot IA</h3>
              <p className="text-sm text-muted-foreground">
                Plus vous ajoutez d'informations dans vos bases de connaissances, plus vos bots IA seront précis et performants. 
                Pensez à ajouter des FAQ, des exemples concrets et toutes les informations utiles à vos clients.
              </p>
            </div>
          </div>
        </Card>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La base de connaissances sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
