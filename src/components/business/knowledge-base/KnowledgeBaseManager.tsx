import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  ArrowLeft, MoreVertical, Edit, Bot, Download, Trash2, Plus, Database, Sparkles,
  FileJson, FileSpreadsheet, FileText, Eye
} from 'lucide-react';
import { useKnowledgeBases } from '@/hooks/useKnowledgeBases';
import { useIsMobile } from '@/hooks/use-mobile';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface KnowledgeBaseManagerProps {
  onBack: () => void;
  onCreateNew: () => void;
  onView?: (id: string) => void;
}

export const KnowledgeBaseManager: React.FC<KnowledgeBaseManagerProps> = ({ onBack, onCreateNew, onView }) => {
  const { knowledgeBases, loading, deleteKnowledgeBase, exportKnowledgeBase } = useKnowledgeBases();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedKbId, setSelectedKbId] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const handleDelete = async () => {
    if (selectedKbId) {
      await deleteKnowledgeBase(selectedKbId);
      setDeleteDialogOpen(false);
      setSelectedKbId(null);
    }
  };

  const getSectorColor = (sector: string) => {
    const colors: Record<string, string> = {
      restaurant: 'bg-orange-100 text-orange-700 border-orange-200',
      hotel: 'bg-blue-100 text-blue-700 border-blue-200',
      real_estate: 'bg-green-100 text-green-700 border-green-200',
      ecommerce: 'bg-purple-100 text-purple-700 border-purple-200',
      training: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      university: 'bg-cyan-100 text-cyan-700 border-cyan-200',
      clinic: 'bg-red-100 text-red-700 border-red-200'
    };
    return colors[sector] || 'bg-muted text-muted-foreground';
  };

  const getSectorLabel = (sector: string) => {
    const labels: Record<string, string> = {
      restaurant: 'Restauration', hotel: 'Hôtellerie', real_estate: 'Immobilier',
      ecommerce: 'E-commerce', training: 'Formation', university: 'Université', clinic: 'Clinique'
    };
    return labels[sector] || sector;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
          <p className="mt-3 text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="outline" size={isMobile ? 'sm' : 'default'} onClick={onBack} className="shrink-0">
            <ArrowLeft className="w-4 h-4" />
            {!isMobile && <span className="ml-1.5">Retour</span>}
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold truncate">Mes Bases de Connaissances</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 hidden sm:block">
              Gérez vos bases de données pour l'entraînement de vos bots IA
            </p>
          </div>
        </div>
        <Button onClick={onCreateNew} size={isMobile ? 'sm' : 'default'} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-1.5" />
          Nouvelle Base
        </Button>
      </div>

      {/* Content */}
      {knowledgeBases.length === 0 ? (
        <Card className="p-6 sm:p-10">
          <div className="text-center space-y-4">
            <div className="w-14 h-14 sm:w-18 sm:h-18 bg-muted rounded-2xl flex items-center justify-center mx-auto">
              <Database className="w-7 h-7 sm:w-9 sm:h-9 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-base sm:text-xl font-semibold mb-1.5">Aucune base de connaissances</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mb-5 max-w-md mx-auto">
                Créez votre première base pour entraîner vos bots IA avec vos données métier
              </p>
              <Button onClick={onCreateNew} size="lg" className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Créer ma première base
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className={`grid gap-3 sm:gap-5 ${isMobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3'}`}>
          {knowledgeBases.map((kb) => (
            <Card 
              key={kb.id} 
              className="hover:shadow-lg transition-all duration-200 cursor-pointer group overflow-hidden"
              onClick={() => onView?.(kb.id)}
            >
              <CardHeader className="p-3.5 sm:p-5 pb-2">
                <div className="flex items-center justify-between mb-2">
                  <Badge className={`${getSectorColor(kb.sector)} text-[10px] sm:text-xs`}>
                    {getSectorLabel(kb.sector)}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-60 group-hover:opacity-100">
                        <MoreVertical className="w-3.5 h-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem onClick={() => onView?.(kb.id)}><Eye className="w-4 h-4 mr-2" />Visualiser</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onView?.(kb.id)}><Edit className="w-4 h-4 mr-2" />Modifier</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => exportKnowledgeBase(kb, 'json')}><FileJson className="w-4 h-4 mr-2" />JSON</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => exportKnowledgeBase(kb, 'excel')}><FileSpreadsheet className="w-4 h-4 mr-2" />Excel</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => exportKnowledgeBase(kb, 'csv')}><FileText className="w-4 h-4 mr-2" />CSV</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => exportKnowledgeBase(kb, 'pdf')}><FileText className="w-4 h-4 mr-2" />PDF</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => { setSelectedKbId(kb.id); setDeleteDialogOpen(true); }}>
                        <Trash2 className="w-4 h-4 mr-2" />Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <CardTitle className="text-sm sm:text-base line-clamp-1 group-hover:text-primary transition-colors">
                  {kb.name}
                </CardTitle>
                <CardDescription className="text-xs line-clamp-1">
                  {kb.description || 'Base de connaissances'}
                </CardDescription>
              </CardHeader>
              <CardContent className="px-3.5 sm:px-5 pb-3.5 sm:pb-5 space-y-3">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground">Complétion</span>
                    <span className="font-bold text-primary">{kb.completion_percentage}%</span>
                  </div>
                  <Progress value={kb.completion_percentage} className="h-1.5" />
                </div>
                {kb.bot_id && (
                  <Badge variant="default" className="w-full justify-center text-xs py-1">
                    <Bot className="w-3 h-3 mr-1" />Bot actif
                  </Badge>
                )}
                <div className="text-[10px] text-muted-foreground pt-2 border-t">
                  Modifié le {format(new Date(kb.updated_at), 'dd MMM yyyy', { locale: fr })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tips */}
      <div className="space-y-3 sm:space-y-4">
        <Card className="p-3.5 sm:p-5 bg-gradient-to-r from-primary/5 to-transparent border-0 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg shrink-0">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-xs sm:text-sm mb-1">Conseil : Entraînement IA</h3>
              <p className="text-[10px] sm:text-xs text-muted-foreground leading-relaxed">
                Plus vous ajoutez d'informations, plus vos bots IA seront précis. Ajoutez FAQ, exemples et infos utiles.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-3.5 sm:p-5 bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-200/20 rounded-full -mr-12 -mt-12" />
          <div className="flex items-start gap-3 relative z-10">
            <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg shrink-0 shadow-md">
              <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h3 className="font-bold text-xs sm:text-sm text-emerald-900">✨ Créez votre Bot IA</h3>
                <Badge className="bg-emerald-600 text-white border-0 text-[10px]">Automatique</Badge>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] sm:text-xs text-emerald-800">
                  Base complétée → recevez <span className="font-semibold">un lien unique</span> pour :
                </p>
                <div className="grid gap-1.5 sm:gap-2">
                  <div className="flex items-center gap-2 bg-white/50 rounded-lg p-2 border border-emerald-200">
                    <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">1</div>
                    <p className="text-[10px] sm:text-xs font-medium text-emerald-900">Bot WhatsApp IA</p>
                  </div>
                  <div className="flex items-center gap-2 bg-white/50 rounded-lg p-2 border border-emerald-200">
                    <div className="w-5 h-5 rounded-full bg-teal-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">2</div>
                    <p className="text-[10px] sm:text-xs font-medium text-emerald-900">Bot Automatisé 24/7</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg p-2">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <p className="text-[10px] sm:text-xs font-medium">Lien généré à 100% de complétion</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Cette action est irréversible. La base sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto">Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
