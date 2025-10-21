import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  ArrowLeft, 
  Search, 
  MoreVertical, 
  Eye, 
  Download, 
  Trash2,
  Shield,
  Database,
  Users,
  FileDown
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { KnowledgeBaseViewer } from '@/components/business/knowledge-base/KnowledgeBaseViewer';
import { useKnowledgeBases } from '@/hooks/useKnowledgeBases';
import { KnowledgeBase } from '@/types/knowledge-base';

interface AdminKnowledgeBase {
  id: string;
  name: string;
  sector: string;
  user_id: string;
  completion_percentage: number;
  created_at: string;
  updated_at: string;
  user_email?: string;
}

interface AdminKnowledgeBasesPageProps {
  onBack?: () => void;
}

export const AdminKnowledgeBasesPage: React.FC<AdminKnowledgeBasesPageProps> = ({ onBack }) => {
  const [knowledgeBases, setKnowledgeBases] = useState<AdminKnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingKbId, setViewingKbId] = useState<string | null>(null);
  const { toast } = useToast();
  const { exportKnowledgeBase } = useKnowledgeBases();

  useEffect(() => {
    fetchAllKnowledgeBases();
  }, []);

  const fetchAllKnowledgeBases = async () => {
    try {
      setLoading(true);
      
      // Vérifier que l'utilisateur est admin
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      // Récupération de toutes les bases de connaissance (RLS gère les permissions)
      const { data: kbData, error: kbError } = await supabase
        .from('knowledge_bases')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (kbError) throw kbError;

      // Récupérer les informations utilisateurs
      const userIds = [...new Set(kbData?.map(kb => kb.user_id) || [])];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', userIds);

      const profileMap = new Map(profilesData?.map(p => [p.id, p.email]) || []);

      const enrichedData = kbData?.map(kb => ({
        ...kb,
        user_email: profileMap.get(kb.user_id) || 'Inconnu'
      })) || [];

      setKnowledgeBases(enrichedData as AdminKnowledgeBase[]);
    } catch (error: any) {
      console.error('Error fetching knowledge bases:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les bases de connaissances',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('knowledge_bases')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Base de connaissances supprimée'
      });

      await fetchAllKnowledgeBases();
    } catch (error: any) {
      console.error('Error deleting:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer la base',
        variant: 'destructive'
      });
    }
  };

  const handleExport = async (kb: AdminKnowledgeBase, format: 'json' | 'excel' | 'csv' | 'pdf') => {
    await exportKnowledgeBase(kb as KnowledgeBase, format);
  };

  const handleView = (id: string) => {
    setViewingKbId(id);
  };

  const filteredKnowledgeBases = knowledgeBases.filter(kb =>
    kb.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    kb.sector.toLowerCase().includes(searchQuery.toLowerCase()) ||
    kb.user_email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getSectorLabel = (sector: string) => {
    const labels: Record<string, string> = {
      restaurant: 'Restauration',
      hotel: 'Hôtellerie',
      real_estate: 'Immobilier',
      ecommerce: 'E-commerce',
      training: 'Formation',
      university: 'Université & École',
      clinic: 'Clinique',
      others: 'Autres'
    };
    return labels[sector] || sector;
  };

  // Si on visualise une base de connaissances
  if (viewingKbId) {
    return (
      <KnowledgeBaseViewer
        knowledgeBaseId={viewingKbId}
        onBack={() => setViewingKbId(null)}
      />
    );
  }

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
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
            {onBack && (
              <Button variant="outline" onClick={onBack} className="shrink-0">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                <h1 className="text-xl sm:text-2xl font-bold">Administration - Bases de Connaissances</h1>
              </div>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">
                Gestion complète de toutes les bases de connaissances
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total des bases</CardDescription>
              <CardTitle className="text-3xl">{knowledgeBases.length}</CardTitle>
            </CardHeader>
            <CardContent>
              <Database className="w-8 h-8 text-primary" />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Utilisateurs uniques</CardDescription>
              <CardTitle className="text-3xl">
                {new Set(knowledgeBases.map(kb => kb.user_id)).size}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Users className="w-8 h-8 text-primary" />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Complétion moyenne</CardDescription>
              <CardTitle className="text-3xl">
                {Math.round(knowledgeBases.reduce((acc, kb) => acc + kb.completion_percentage, 0) / knowledgeBases.length || 0)}%
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Shield className="w-8 h-8 text-primary" />
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, secteur ou utilisateur..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Toutes les bases de connaissances</CardTitle>
            <CardDescription className="text-sm">
              {filteredKnowledgeBases.length} base(s) trouvée(s)
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[150px]">Nom</TableHead>
                    <TableHead className="min-w-[120px]">Secteur</TableHead>
                    <TableHead className="hidden md:table-cell min-w-[150px]">Propriétaire</TableHead>
                    <TableHead className="min-w-[100px]">Complétion</TableHead>
                    <TableHead className="hidden lg:table-cell min-w-[120px]">Créée le</TableHead>
                    <TableHead className="text-right min-w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredKnowledgeBases.map((kb) => (
                    <TableRow key={kb.id}>
                      <TableCell className="font-medium text-sm sm:text-base">{kb.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs sm:text-sm whitespace-nowrap">
                          {getSectorLabel(kb.sector)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground truncate max-w-[200px]">
                        {kb.user_email}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{kb.completion_percentage}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">
                        {format(new Date(kb.created_at), 'dd MMM yyyy', { locale: fr })}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(kb.id)}>
                              <Eye className="w-4 h-4 mr-2" />
                              Voir & Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleExport(kb, 'excel')}>
                              <FileDown className="w-4 h-4 mr-2" />
                              Excel
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleExport(kb, 'csv')}>
                              <FileDown className="w-4 h-4 mr-2" />
                              CSV
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleExport(kb, 'pdf')}>
                              <FileDown className="w-4 h-4 mr-2" />
                              PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleExport(kb, 'json')}>
                              <FileDown className="w-4 h-4 mr-2" />
                              JSON
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => handleDelete(kb.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
