
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { 
  Mail, 
  Phone, 
  Building2, 
  Calendar, 
  MoreHorizontal,
  Users,
  Edit,
  Trash2,
  Star,
  StarOff,
  Plus,
  Download
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { useProspects } from '@/hooks/useProspects';
import { useToast } from '@/hooks/use-toast';
import { ProspectExportModal } from './ProspectExportModal';
import { CreateCampaignModal } from './CreateCampaignModal';

interface ProspectListProps {
  searchTerm: string;
}

export const ProspectList: React.FC<ProspectListProps> = ({ searchTerm }) => {
  const { prospects, isLoading, stats, deleteProspect, updateProspect } = useProspects({ searchTerm });
  const [selectedProspects, setSelectedProspects] = useState<string[]>([]);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isCampaignOpen, setIsCampaignOpen] = useState(false);
  const { toast } = useToast();

  const getStatusColor = (status: string) => {
    const colors = {
      new: 'bg-blue-100 text-blue-800 border-blue-200',
      contacted: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      qualified: 'bg-purple-100 text-purple-800 border-purple-200',
      converted: 'bg-green-100 text-green-800 border-green-200',
      lost: 'bg-red-100 text-red-800 border-red-200',
    };
    return colors[status as keyof typeof colors] || colors.new;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const handleToggleFavorite = async (prospect: any) => {
    const newScore = prospect.score === 100 ? 50 : 100; // Simple toggle pour les favoris
    await updateProspect(prospect.id, { score: newScore });
  };

  const handleDelete = async (prospectId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce prospect ?')) {
      await deleteProspect(prospectId);
    }
  };

  const handleEdit = (prospect: any) => {
    toast({
      title: "Fonctionnalité disponible",
      description: `Édition du prospect "${prospect.first_name} ${prospect.last_name}".`,
    });
  };

  const handleContact = (prospect: any, method: 'email' | 'phone') => {
    if (method === 'email' && prospect.email) {
      window.open(`mailto:${prospect.email}`, '_blank');
    } else if (method === 'phone' && prospect.phone) {
      window.open(`tel:${prospect.phone}`, '_blank');
    } else {
      toast({
        title: "Information manquante",
        description: `Aucune information de ${method === 'email' ? 'email' : 'téléphone'} pour ce prospect.`,
        variant: "destructive"
      });
    }
  };

  const toggleProspectSelection = (prospectId: string) => {
    setSelectedProspects(prev =>
      prev.includes(prospectId)
        ? prev.filter(id => id !== prospectId)
        : [...prev, prospectId]
    );
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
                <div className="h-3 bg-muted rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (prospects.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {searchTerm ? 'Aucun prospect trouvé' : 'Aucun prospect'}
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm 
              ? `Aucun prospect ne correspond à "${searchTerm}".`
              : 'Commencez par créer ou importer vos premiers prospects.'
            }
          </p>
          {!searchTerm && (
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un prospect
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistiques rapides */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.totalProspects}</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.newProspects}</div>
            <div className="text-sm text-muted-foreground">Nouveaux</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.contactedProspects}</div>
            <div className="text-sm text-muted-foreground">Contactés</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.qualifiedProspects}</div>
            <div className="text-sm text-muted-foreground">Qualifiés</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-700">{stats.convertedProspects}</div>
            <div className="text-sm text-muted-foreground">Convertis</div>
          </CardContent>
        </Card>
      </div>

      {/* Actions en lot */}
      {selectedProspects.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span className="font-medium">{selectedProspects.length} prospect(s) sélectionné(s)</span>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm">
                  <Mail className="w-4 h-4 mr-1" />
                  Email en lot
                </Button>
                <Button variant="outline" size="sm" onClick={() => setIsExportOpen(true)}>
                  <Download className="w-4 h-4 mr-1" />
                  Exporter
                </Button>
                <Button variant="outline" size="sm" onClick={() => setIsCampaignOpen(true)}>
                  <Mail className="w-4 h-4 mr-1" />
                  Campagne
                </Button>
                <Button variant="destructive" size="sm">
                  <Trash2 className="w-4 h-4 mr-1" />
                  Supprimer
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Liste des prospects */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {prospects.map((prospect) => (
          <Card key={prospect.id} className="hover:shadow-md transition-shadow relative">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedProspects.includes(prospect.id)}
                    onChange={() => toggleProspectSelection(prospect.id)}
                    className="rounded border-gray-300"
                  />
                  <div>
                    <h3 className="font-semibold text-lg">
                      {prospect.first_name} {prospect.last_name}
                    </h3>
                    {prospect.company && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Building2 className="w-4 h-4 mr-1" />
                        {prospect.company}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleFavorite(prospect)}
                  >
                    {prospect.score >= 80 ? (
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    ) : (
                      <StarOff className="w-4 h-4 text-gray-400" />
                    )}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(prospect)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleContact(prospect, 'email')}>
                        <Mail className="w-4 h-4 mr-2" />
                        Envoyer email
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleContact(prospect, 'phone')}>
                        <Phone className="w-4 h-4 mr-2" />
                        Appeler
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDelete(prospect.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge className={getStatusColor(prospect.status)}>
                  {prospect.status}
                </Badge>
                <div className={`text-sm font-medium ${getScoreColor(prospect.score)}`}>
                  Score: {prospect.score}%
                </div>
              </div>

              {prospect.email && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Mail className="w-4 h-4 mr-2" />
                  <span className="truncate">{prospect.email}</span>
                </div>
              )}

              {prospect.phone && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Phone className="w-4 h-4 mr-2" />
                  {prospect.phone}
                </div>
              )}

              {prospect.position && (
                <div className="text-sm text-muted-foreground">
                  <strong>Poste:</strong> {prospect.position}
                </div>
              )}

              {prospect.notes && (
                <div className="text-xs text-muted-foreground bg-gray-50 p-2 rounded">
                  {prospect.notes.length > 100 
                    ? `${prospect.notes.substring(0, 100)}...`
                    : prospect.notes
                  }
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                <div className="flex items-center">
                  <Calendar className="w-3 h-3 mr-1" />
                  {new Date(prospect.created_at).toLocaleDateString('fr-FR')}
                </div>
                <div className="text-right">
                  Source: {prospect.source}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modals */}
      <ProspectExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        selectedProspects={selectedProspects}
      />
      
      <CreateCampaignModal
        isOpen={isCampaignOpen}
        onClose={() => setIsCampaignOpen(false)}
        selectedProspects={selectedProspects}
      />
    </div>
  );
};
