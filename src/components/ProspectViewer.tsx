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
import { useProspectEvaluationWebhook } from '@/hooks/useProspectEvaluationWebhook';
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
  Trash2,
  Sparkles,
  History,
  BarChart3
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

  const {
    webhookConfig,
    isLoading: isEvaluating,
    evaluationResults,
    triggerEvaluation,
    hasBeenEvaluated,
    getProspectEvaluationHistory
  } = useProspectEvaluationWebhook();

  const [evaluatingProspect, setEvaluatingProspect] = useState<string | null>(null);

  // Fonction pour gérer l'évaluation d'un prospect
  const handleEvaluateProspect = async (prospect: GoogleSheetProspectWithUser) => {
    if (!getRunStatus(prospect)) {
      toast.error('Le prospect doit être activé avant l\'évaluation');
      return;
    }

    setEvaluatingProspect(prospect.id);
    
    const success = await triggerEvaluation(
      {
        id: prospect.id,
        contact_name: prospect.contact_name || prospect['Nom du contact'] || '',
        company_name: prospect.company_name || prospect['Nom de l\'entreprise'] || '',
        email: prospect.email || prospect['Email'] || '',
        phone: prospect.phone || prospect['Téléphone'] || '',
        linkedin_url: prospect.linkedin_url || prospect['Profil LinkedIn'] || '',
        website: prospect.website || prospect['Site web'] || ''
      },
      (prospectId: string, value: string) => 
        updateProspectField(
          { spreadsheetId, sheetName },
          prospectId,
          'Statut',
          value
        )
    );

    if (success) {
      // Rafraîchir les données pour voir les changements
      refreshData();
      toast.success('Évaluation lancée avec succès');
    } else {
      toast.error('Erreur lors du lancement de l\'évaluation');
    }
    
    setEvaluatingProspect(null);
  };

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

                    {/* Evaluate Prospect */}
                    <Button
                      onClick={() => handleEvaluateProspect(prospect)}
                      disabled={evaluatingProspect === prospect.id || !getRunStatus(prospect)}
                      size="sm"
                      variant="outline"
                      className="border-purple-200 hover:bg-purple-50"
                    >
                      {evaluatingProspect === prospect.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-1" />
                          {hasBeenEvaluated(prospect.id) ? 'Réévaluer' : 'Évaluer'}
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
                          <BarChart3 className="w-4 h-4 mr-1" />
                          Résultats
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <BarChart3 className="w-5 h-5" />
                            Résultats d'évaluation
                          </DialogTitle>
                        </DialogHeader>
                        {selectedProspect && (
                          <div className="space-y-6">
                            {/* Prospect Info Header */}
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                              <div>
                                <h3 className="font-semibold text-lg">{selectedProspect.contact_name || selectedProspect['Nom du contact'] || 'Non défini'}</h3>
                                <p className="text-muted-foreground">{selectedProspect.company_name || selectedProspect['Nom de l\'entreprise'] || 'Non définie'}</p>
                              </div>
                              <Button
                                onClick={() => handleEvaluateProspect(selectedProspect)}
                                disabled={isEvaluating || !getRunStatus(selectedProspect)}
                                size="sm"
                                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                              >
                                {isEvaluating ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Évaluation...
                                  </>
                                ) : hasBeenEvaluated(selectedProspect.id) ? (
                                  <>
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Réévaluer
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    Évaluer
                                  </>
                                )}
                              </Button>
                            </div>

                            {/* Check if we have evaluation data from Google Sheets */}
                            {selectedProspect['Pertinence du prospect par rapport à notre offre ? (sur 100)'] || 
                             selectedProspect['explanation'] || 
                             selectedProspect['Préparation de l\'appel'] ||
                             selectedProspect['company_website'] ||
                             selectedProspect['linkedin_contact_url'] ? (
                              
                              <div className="space-y-6">
                                <h4 className="font-semibold flex items-center gap-2 text-lg">
                                  <BarChart3 className="w-5 h-5 text-purple-600" />
                                  Résultats d'évaluation
                                </h4>

                                <div className="grid gap-6">
                                  {/* Company Website */}
                                  {selectedProspect['company_website'] && (
                                    <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <Globe className="w-5 h-5 text-blue-600" />
                                          <span className="font-medium">Site web de l'entreprise</span>
                                        </div>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => window.open(selectedProspect['company_website'], '_blank')}
                                          className="border-blue-200 hover:bg-blue-100"
                                        >
                                          <Globe className="w-4 h-4 mr-1" />
                                          Visiter
                                        </Button>
                                      </div>
                                      <p className="text-sm text-blue-600 mt-2 font-mono">
                                        {selectedProspect['company_website']}
                                      </p>
                                    </Card>
                                  )}

                                  {/* LinkedIn Contact */}
                                  {selectedProspect['linkedin_contact_url'] && (
                                    <Card className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <User className="w-5 h-5 text-blue-600" />
                                          <span className="font-medium">Profil LinkedIn du contact</span>
                                        </div>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => window.open(selectedProspect['linkedin_contact_url'], '_blank')}
                                          className="border-blue-200 hover:bg-blue-100"
                                        >
                                          <User className="w-4 h-4 mr-1" />
                                          Voir profil
                                        </Button>
                                      </div>
                                      <p className="text-sm text-blue-600 mt-2 font-mono">
                                        {selectedProspect['linkedin_contact_url']}
                                      </p>
                                    </Card>
                                  )}

                                  {/* Role */}
                                  {selectedProspect['Rôle'] && (
                                    <Card className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
                                      <div className="flex items-center gap-2">
                                        <User className="w-5 h-5 text-purple-600" />
                                        <span className="font-medium">Rôle dans l'entreprise</span>
                                        <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">
                                          {selectedProspect['Rôle']}
                                        </Badge>
                                      </div>
                                    </Card>
                                  )}

                                  {/* Relevance Score */}
                                  {selectedProspect['Pertinence du prospect par rapport à notre offre ? (sur 100)'] && (
                                    <Card className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
                                      <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                          <span className="font-semibold text-lg flex items-center gap-2">
                                            <BarChart3 className="w-5 h-5 text-green-600" />
                                            Pertinence du prospect
                                          </span>
                                          <Badge variant="outline" className="bg-green-100 text-green-800 text-xl px-4 py-2 font-bold">
                                            {selectedProspect['Pertinence du prospect par rapport à notre offre ? (sur 100)']}%
                                          </Badge>
                                        </div>
                                        <div className="space-y-3">
                                          <div className="w-full bg-gray-200 rounded-full h-6 shadow-inner">
                                            <div 
                                              className="bg-gradient-to-r from-green-400 to-emerald-500 h-6 rounded-full transition-all duration-1000 flex items-center justify-end pr-3 shadow-lg"
                                              style={{ 
                                                width: `${Math.min(100, Math.max(0, parseFloat(selectedProspect['Pertinence du prospect par rapport à notre offre ? (sur 100)'] || '0')))}%` 
                                              }}
                                            >
                                              <span className="text-white text-sm font-bold">
                                                {selectedProspect['Pertinence du prospect par rapport à notre offre ? (sur 100)']}%
                                              </span>
                                            </div>
                                          </div>
                                          <div className="flex justify-between text-sm text-muted-foreground">
                                            <span>0% - Faible</span>
                                            <span>50% - Modérée</span>
                                            <span>100% - Élevée</span>
                                          </div>
                                        </div>
                                      </div>
                                    </Card>
                                  )}

                                  {/* Status */}
                                  {selectedProspect['Statut'] && (
                                    <Card className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
                                      <div className="flex items-center gap-2">
                                        <CheckCircle className="w-5 h-5 text-yellow-600" />
                                        <span className="font-medium">Statut d'évaluation</span>
                                        <Badge className={getStatusColor(selectedProspect['Statut'])} variant="outline">
                                          {selectedProspect['Statut']}
                                        </Badge>
                                      </div>
                                    </Card>
                                  )}

                                  {/* Explanation */}
                                  {selectedProspect['explanation'] && (
                                    <Card className="p-6 bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
                                      <div className="space-y-4">
                                        <div className="flex items-center gap-2">
                                          <Eye className="w-5 h-5 text-indigo-600" />
                                          <span className="font-semibold text-lg">Justification du score</span>
                                        </div>
                                        <div className="bg-white p-5 rounded-lg border border-indigo-100 shadow-sm">
                                          <p className="text-sm leading-relaxed text-gray-700">
                                            {selectedProspect['explanation']}
                                          </p>
                                        </div>
                                      </div>
                                    </Card>
                                  )}

                                  {/* Call Preparation */}
                                  {selectedProspect['Préparation de l\'appel'] && (
                                    <Card className="p-6 bg-gradient-to-r from-teal-50 to-cyan-50 border-teal-200">
                                      <div className="space-y-4">
                                        <div className="flex items-center gap-2">
                                          <Phone className="w-5 h-5 text-teal-600" />
                                          <span className="font-semibold text-lg">Préparation de l'appel</span>
                                        </div>
                                        <div className="bg-white p-5 rounded-lg border border-teal-100 shadow-sm">
                                          <p className="text-sm leading-relaxed mb-4 text-gray-700">
                                            {selectedProspect['Préparation de l\'appel']}
                                          </p>
                                          <div className="flex gap-3">
                                            <Button 
                                              size="sm" 
                                              variant="outline"
                                              className="border-teal-200 hover:bg-teal-50 flex-1"
                                            >
                                              <Eye className="w-4 h-4 mr-2" />
                                              Voir le contenu complet
                                            </Button>
                                            <Button 
                                              size="sm" 
                                              variant="outline"
                                              className="border-teal-200 hover:bg-teal-50 flex-1"
                                            >
                                              <Globe className="w-4 h-4 mr-2" />
                                              Télécharger le document
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    </Card>
                                  )}
                                </div>
                              </div>

                            ) : (
                              <div className="text-center py-12">
                                <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-8 border border-gray-200">
                                  <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                                  <h4 className="font-semibold text-lg mb-2">Aucun résultat d'évaluation disponible</h4>
                                  <p className="text-muted-foreground mb-4">
                                    Lancez une évaluation pour voir les résultats détaillés ici.<br/>
                                    Les résultats incluront la pertinence, les justifications et la préparation d'appel.
                                  </p>
                                  {getRunStatus(selectedProspect) ? (
                                    <Button
                                      onClick={() => handleEvaluateProspect(selectedProspect)}
                                      disabled={isEvaluating}
                                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                                    >
                                      {isEvaluating ? (
                                        <>
                                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                          Évaluation en cours...
                                        </>
                                      ) : (
                                        <>
                                          <Sparkles className="w-4 h-4 mr-2" />
                                          Démarrer l'évaluation
                                        </>
                                      )}
                                    </Button>
                                  ) : (
                                    <p className="text-sm text-orange-600 bg-orange-50 p-3 rounded-lg">
                                      ⚠️ Activez d'abord ce prospect pour pouvoir l'évaluer
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Additional Contact Details */}
                            <div className="space-y-4 pt-6 border-t border-gray-200">
                              <h4 className="font-semibold text-muted-foreground">Informations de contact</h4>
                              <div className="grid gap-3">
                                {selectedProspect.email && (
                                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                    <Mail className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-sm">{selectedProspect.email}</span>
                                  </div>
                                )}
                                {selectedProspect.phone && (
                                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                    <Phone className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-sm">{selectedProspect.phone}</span>
                                  </div>
                                )}
                                {selectedProspect['Date d\'ajout'] && (
                                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                    <Calendar className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-sm">Ajouté le {selectedProspect['Date d\'ajout']}</span>
                                  </div>
                                )}
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