import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useGoogleSheets, GoogleSheetProspectWithUser } from '@/hooks/useGoogleSheets';
import { useGoogleSheetsWriter } from '@/hooks/useGoogleSheetsWriter';
import { 
  Users, 
  Search, 
  Eye, 
  Building, 
  User, 
  Phone,
  Mail,
  Globe,
  Calendar,
  ArrowLeft,
  Play,
  Pause,
  Loader2,
  CheckCircle,
  XCircle,
  RefreshCw,
  Trash2
} from 'lucide-react';

interface ProspectViewerProps {
  spreadsheetId: string;
  sheetName: string;
  onBack: () => void;
}

export const ProspectViewer: React.FC<ProspectViewerProps> = ({
  spreadsheetId,
  sheetName,
  onBack
}) => {
  const { user } = useAuth();
  const [filteredProspects, setFilteredProspects] = useState<GoogleSheetProspectWithUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProspect, setSelectedProspect] = useState<GoogleSheetProspectWithUser | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [updatingProspect, setUpdatingProspect] = useState<string | null>(null); // Track which prospect is being updated
  const [deletingProspect, setDeletingProspect] = useState<string | null>(null); // Track which prospect is being deleted

  const {
    data: prospects,
    isLoading: isLoadingSheets,
    error: sheetsError,
    refreshData
  } = useGoogleSheets({ spreadsheetId, sheetName }, user?.id);

  const {
    updateProspectField,
    deleteProspectById,
    isWriting
  } = useGoogleSheetsWriter(user?.id);

  useEffect(() => {
    setFilteredProspects(prospects || []);
  }, [prospects]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredProspects(prospects || []);
    } else {
      const filtered = (prospects || []).filter(prospect =>
        (prospect.contact_name || prospect['Nom du contact'])?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (prospect.company_name || prospect['Nom de l\'entreprise'])?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prospect['Rôle']?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredProspects(filtered);
    }
  }, [searchTerm, prospects]);

  const handleToggleRun = async (prospect: GoogleSheetProspectWithUser, activate: boolean) => {
    setUpdatingProspect(prospect.id); // Mark this specific prospect as updating
    
    const success = await updateProspectField(
      { spreadsheetId, sheetName },
      prospect.id,
      'Run',
      activate ? 'true' : 'false'
    );

    if (success) {
      // Mettre à jour localement et rafraîchir les données
      refreshData();
      
      if (selectedProspect?.id === prospect.id) {
        setSelectedProspect(prev => prev ? { ...prev, Run: activate ? 'true' : 'false' } : null);
      }
      
      toast.success(`Prospect ${activate ? 'activé' : 'désactivé'} avec succès`);
    }
    
    setUpdatingProspect(null); // Reset updating state
  };

  const handleDeleteProspect = async (prospect: GoogleSheetProspectWithUser) => {
    if (!prospect.id) {
      toast.error('Impossible de supprimer: ID manquant');
      return;
    }

    // Confirmation de suppression
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le prospect "${prospect.contact_name || 'Sans nom'}" ?`)) {
      return;
    }

    setDeletingProspect(prospect.id);
    
    const success = await deleteProspectById(
      { spreadsheetId, sheetName },
      prospect.id
    );

    if (success) {
      // Rafraîchir les données après suppression
      refreshData();
      
      // Fermer la modal si c'est le prospect sélectionné qui a été supprimé
      if (selectedProspect?.id === prospect.id) {
        setSelectedProspect(null);
        setIsDialogOpen(false);
      }
      
      toast.success(`Prospect "${prospect.contact_name || 'Sans nom'}" supprimé avec succès`);
    }
    
    setDeletingProspect(null);
  };

  const getRunStatus = (prospect: GoogleSheetProspectWithUser) => {
    return prospect.Run?.toLowerCase() === 'true';
  };

  const getStatusColor = (statut?: string) => {
    switch (statut?.toLowerCase()) {
      case 'qualifié':
        return 'bg-green-100 text-green-800';
      case 'en cours':
        return 'bg-blue-100 text-blue-800';
      case 'non qualifié':
        return 'bg-red-100 text-red-800';
      case 'en attente':
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (isLoadingSheets) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-8">
            <div className="flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-3 text-lg">Chargement de vos prospects...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (sheetsError) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card className="border-0 shadow-lg border-red-200">
          <CardContent className="p-8 text-center">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-800 mb-2">
              Erreur de chargement
            </h3>
            <p className="text-red-600 mb-4">
              Impossible de charger les prospects depuis Google Sheets
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={refreshData} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Réessayer
              </Button>
              <Button onClick={onBack} variant="ghost">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-purple-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                onClick={onBack}
                variant="ghost"
                size="sm"
                className="hover:bg-white/70"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
              <div>
                <CardTitle className="text-2xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Mes Prospects
                </CardTitle>
                <p className="text-muted-foreground">
                  Gérez vos prospects et leur statut d'activation
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="text-lg px-3 py-1">
              {filteredProspects.length} prospect{filteredProspects.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Search */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Rechercher par nom, entreprise ou rôle..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Prospects List */}
      {filteredProspects.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              {searchTerm ? 'Aucun prospect trouvé' : 'Aucun prospect'}
            </h3>
            <p className="text-gray-500">
              {searchTerm 
                ? 'Essayez avec d\'autres termes de recherche'
                : 'Commencez par ajouter votre premier prospect'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredProspects.map((prospect) => (
            <Card key={prospect.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">
                          {prospect.contact_name || prospect['Nom du contact'] || 'Contact non défini'}
                        </h3>
                        <Badge className={getStatusColor(prospect.Statut)}>
                          {prospect.Statut || 'En attente'}
                        </Badge>
                        {getRunStatus(prospect) && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Actif
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Building className="w-4 h-4" />
                          {prospect.company_name || prospect['Nom de l\'entreprise'] || 'Entreprise non définie'}
                        </div>
                        {prospect['Rôle'] && (
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {prospect['Rôle']}
                          </div>
                        )}
                        {prospect['Pertinence du prospect par rapport à notre offre ? (sur 100)'] && (
                          <Badge variant="outline" className="text-xs">
                            Score: {prospect['Pertinence du prospect par rapport à notre offre ? (sur 100)']}%
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Toggle Run Status */}
                    <Button
                      onClick={() => handleToggleRun(prospect, !getRunStatus(prospect))}
                      disabled={updatingProspect === prospect.id}
                      size="sm"
                      variant={getRunStatus(prospect) ? "destructive" : "default"}
                      className={getRunStatus(prospect) ? "" : "bg-green-600 hover:bg-green-700"}
                    >
                      {updatingProspect === prospect.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : getRunStatus(prospect) ? (
                        <>
                          <Pause className="w-4 h-4 mr-1" />
                          Arrêter
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-1" />
                          Démarrer
                        </>
                      )}
                    </Button>

                    {/* Delete Prospect */}
                    <Button
                      onClick={() => handleDeleteProspect(prospect)}
                      disabled={deletingProspect === prospect.id}
                      size="sm"
                      variant="destructive"
                    >
                      {deletingProspect === prospect.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4 mr-1" />
                          Supprimer
                        </>
                      )}
                    </Button>

                    {/* View Details */}
                    <Dialog open={isDialogOpen && selectedProspect?.id === prospect.id} onOpenChange={setIsDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedProspect(prospect);
                            setIsDialogOpen(true);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Détails
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <User className="w-5 h-5" />
                            Détails du prospect
                          </DialogTitle>
                        </DialogHeader>
                        {selectedProspect && (
                          <div className="space-y-6">
                            {/* Basic Info */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium text-gray-700">Nom du contact</label>
                                <p className="text-lg font-semibold">
                                  {selectedProspect.contact_name || selectedProspect['Nom du contact'] || 'Non défini'}
                                </p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-700">Entreprise</label>
                                <p className="text-lg font-semibold">
                                  {selectedProspect.company_name || selectedProspect['Nom de l\'entreprise'] || 'Non définie'}
                                </p>
                              </div>
                            </div>

                            {/* Additional Info */}
                            <div className="grid grid-cols-2 gap-4">
                              {selectedProspect['Rôle'] && (
                                <div>
                                  <label className="text-sm font-medium text-gray-700">Rôle</label>
                                  <p>{selectedProspect['Rôle']}</p>
                                </div>
                              )}
                              {selectedProspect.company_website && (
                                <div>
                                  <label className="text-sm font-medium text-gray-700">Site web</label>
                                  <p className="flex items-center gap-1">
                                    <Globe className="w-4 h-4" />
                                    <a 
                                      href={selectedProspect.company_website} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:underline"
                                    >
                                      {selectedProspect.company_website}
                                    </a>
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* LinkedIn */}
                            {selectedProspect.linkedin_contact_url && (
                              <div>
                                <label className="text-sm font-medium text-gray-700">LinkedIn</label>
                                <p>
                                  <a 
                                    href={selectedProspect.linkedin_contact_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline"
                                  >
                                    {selectedProspect.linkedin_contact_url}
                                  </a>
                                </p>
                              </div>
                            )}

                            {/* Scoring */}
                            {selectedProspect['Pertinence du prospect par rapport à notre offre ? (sur 100)'] && (
                              <div>
                                <label className="text-sm font-medium text-gray-700">Score de pertinence</label>
                                <div className="flex items-center gap-3">
                                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                                    <div 
                                      className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 h-2 rounded-full"
                                      style={{ 
                                        width: `${Math.min(100, Math.max(0, parseInt(selectedProspect['Pertinence du prospect par rapport à notre offre ? (sur 100)'] || '0')))}%` 
                                      }}
                                    ></div>
                                  </div>
                                  <span className="text-sm font-medium">
                                    {selectedProspect['Pertinence du prospect par rapport à notre offre ? (sur 100)']}%
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Call Preparation */}
                            {selectedProspect['Préparation de l\'appel'] && (
                              <div>
                                <label className="text-sm font-medium text-gray-700">Préparation de l'appel</label>
                                <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                                  <p className="whitespace-pre-wrap">{selectedProspect['Préparation de l\'appel']}</p>
                                </div>
                              </div>
                            )}

                            {/* Status */}
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                              <div>
                                <label className="text-sm font-medium text-gray-700">Statut</label>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge className={getStatusColor(selectedProspect.Statut)}>
                                    {selectedProspect.Statut || 'En attente'}
                                  </Badge>
                                  {getRunStatus(selectedProspect) && (
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      Actif
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => handleToggleRun(selectedProspect, !getRunStatus(selectedProspect))}
                                  disabled={updatingProspect === selectedProspect.id}
                                  size="sm"
                                  variant={getRunStatus(selectedProspect) ? "destructive" : "default"}
                                  className={getRunStatus(selectedProspect) ? "" : "bg-green-600 hover:bg-green-700"}
                                >
                                  {updatingProspect === selectedProspect.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : getRunStatus(selectedProspect) ? (
                                    <>
                                      <Pause className="w-4 h-4 mr-1" />
                                      Arrêter
                                    </>
                                  ) : (
                                    <>
                                      <Play className="w-4 h-4 mr-1" />
                                      Démarrer
                                    </>
                                  )}
                                </Button>
                                
                                <Button
                                  onClick={() => handleDeleteProspect(selectedProspect)}
                                  disabled={deletingProspect === selectedProspect.id}
                                  size="sm"
                                  variant="destructive"
                                >
                                  {deletingProspect === selectedProspect.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <>
                                      <Trash2 className="w-4 h-4 mr-1" />
                                      Supprimer
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};