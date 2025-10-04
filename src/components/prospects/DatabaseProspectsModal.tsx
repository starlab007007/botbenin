import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Users, 
  Search, 
  Mail, 
  Phone, 
  Building2, 
  Star,
  Edit,
  Trash2,
  Download,
  Plus,
  Filter
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ProspectDatabase } from '@/hooks/useProspectDatabases';
import { ProspectExportModal } from './ProspectExportModal';
import { EditProspectModal } from './EditProspectModal';
import { CreateProspectModal } from './CreateProspectModal';

interface DatabaseProspectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  database: ProspectDatabase | null;
}

export const DatabaseProspectsModal: React.FC<DatabaseProspectsModalProps> = ({ 
  isOpen, 
  onClose, 
  database 
}) => {
  const [prospects, setProspects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [editingProspect, setEditingProspect] = useState<any>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && database) {
      fetchProspects();
    }
  }, [isOpen, database]);

  const fetchProspects = async () => {
    if (!database) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('prospects')
        .select('*')
        .eq('database_id', database.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProspects(data || []);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les prospects.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (prospectId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce prospect ?')) return;

    try {
      const { error } = await supabase
        .from('prospects')
        .delete()
        .eq('id', prospectId);

      if (error) throw error;

      toast({
        title: "Prospect supprimé",
        description: "Le prospect a été supprimé avec succès.",
      });

      fetchProspects();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le prospect.",
        variant: "destructive"
      });
    }
  };

  const filteredProspects = prospects.filter(p => {
    const search = searchTerm.toLowerCase();
    return (
      p.first_name?.toLowerCase().includes(search) ||
      p.last_name?.toLowerCase().includes(search) ||
      p.email?.toLowerCase().includes(search) ||
      p.company?.toLowerCase().includes(search)
    );
  });

  if (!database) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center text-lg sm:text-xl">
              <Users className="w-5 h-5 mr-2" />
              Prospects de "{database.name}"
            </DialogTitle>
            <DialogDescription>
              {database.prospect_count || 0} prospects dans cette base
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col space-y-4">
            {/* Actions toolbar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un prospect..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsExportOpen(true)}
                  className="flex-1 sm:flex-none"
                >
                  <Download className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
                <Button 
                  size="sm"
                  onClick={() => setIsCreateOpen(true)}
                  className="flex-1 sm:flex-none"
                >
                  <Plus className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Nouveau</span>
                </Button>
              </div>
            </div>

            {/* Prospects list */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-40">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : filteredProspects.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      {searchTerm ? 'Aucun prospect trouvé' : 'Aucun prospect'}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {searchTerm 
                        ? 'Modifiez votre recherche.'
                        : 'Commencez par ajouter des prospects à cette base.'
                      }
                    </p>
                    {!searchTerm && (
                      <Button onClick={() => setIsCreateOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Ajouter un prospect
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredProspects.map((prospect) => (
                    <Card key={prospect.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold">
                              {prospect.first_name} {prospect.last_name}
                            </h4>
                            {prospect.company && (
                              <div className="flex items-center text-xs text-muted-foreground mt-1">
                                <Building2 className="w-3 h-3 mr-1" />
                                {prospect.company}
                              </div>
                            )}
                          </div>
                          <Badge variant={prospect.status === 'converted' ? 'default' : 'secondary'}>
                            {prospect.status}
                          </Badge>
                        </div>

                        {prospect.email && (
                          <div className="flex items-center text-xs text-muted-foreground mb-1">
                            <Mail className="w-3 h-3 mr-2" />
                            <span className="truncate">{prospect.email}</span>
                          </div>
                        )}

                        {prospect.phone && (
                          <div className="flex items-center text-xs text-muted-foreground mb-3">
                            <Phone className="w-3 h-3 mr-2" />
                            {prospect.phone}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-3 border-t">
                          <div className="flex items-center space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingProspect(prospect)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(prospect.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          {prospect.score >= 80 && (
                            <Star className="w-4 h-4 text-yellow-500 fill-current" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ProspectExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        databaseId={database?.id}
      />

      <EditProspectModal
        isOpen={!!editingProspect}
        onClose={() => setEditingProspect(null)}
        prospect={editingProspect}
        onSuccess={() => {
          setEditingProspect(null);
          fetchProspects();
        }}
      />

      <CreateProspectModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        databaseId={database?.id}
        onSuccess={() => {
          setIsCreateOpen(false);
          fetchProspects();
        }}
      />
    </>
  );
};