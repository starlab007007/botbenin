import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft, 
  FileText, 
  TrendingUp, 
  User, 
  Building, 
  Calendar, 
  Clock, 
  ChevronRight,
  AlertCircle,
  ExternalLink,
  Download,
  History as HistoryIcon,
  Linkedin,
  Globe,
  Star,
  Users,
  Briefcase,
  Eye,
  MessageSquare
} from 'lucide-react';
import { EvaluationResult, EvaluationHistory } from '@/types/evaluation';
import { DocumentPreview } from './DocumentPreview';
import { EvaluationHistoryViewer } from './EvaluationHistoryViewer';
import { useGoogleSheets, GoogleSheetProspectWithUser } from '@/hooks/useGoogleSheets';
import { useAuth } from '@/contexts/AuthContext';

interface EvaluationResultsViewerProps {
  results: EvaluationResult[];
  evaluationHistory: Map<string, EvaluationHistory>;
  onClose: () => void;
  spreadsheetId: string;
  sheetName: string;
}

export const EvaluationResultsViewer: React.FC<EvaluationResultsViewerProps> = ({
  results,
  evaluationHistory,
  onClose,
  spreadsheetId,
  sheetName
}) => {
  const { user } = useAuth();
  const [selectedProspect, setSelectedProspect] = useState<GoogleSheetProspectWithUser | null>(null);
  const [showDocumentPreview, setShowDocumentPreview] = useState(false);
  const [showHistoryViewer, setShowHistoryViewer] = useState<string | null>(null);

  // Fetch Google Sheets data
  const {
    data: prospects,
    isLoading: isLoadingSheets,
    error: sheetsError
  } = useGoogleSheets({ spreadsheetId, sheetName }, user?.id);

  // Initialize with first prospect
  useEffect(() => {
    if (prospects && Array.isArray(prospects) && prospects.length > 0 && !selectedProspect) {
      setSelectedProspect(prospects[0]);
    }
  }, [prospects, selectedProspect]);

  const getOpportunityLevelColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreFromProspect = (prospect: GoogleSheetProspectWithUser): number => {
    const score = prospect['Pertinence du prospect par rapport à notre offre ? (sur 100)'];
    return score ? parseInt(score.toString(), 10) : 0;
  };

  const getStatusColor = (statut?: string) => {
    switch (statut?.toLowerCase()) {
      case 'qualifié':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'en cours':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'non qualifié':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'en attente':
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const downloadPDF = (url: string, filename?: string) => {
    // Convertir l'URL Google Docs en URL de téléchargement PDF
    let downloadUrl = url;
    if (url.includes('docs.google.com')) {
      // Remplacer /edit ou autres par /export?format=pdf
      downloadUrl = url.replace(/\/edit.*$/, '/export?format=pdf');
    }

    // Créer un lien temporaire et déclencher le téléchargement
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename || 'preparation-appel.pdf';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-[95vw] sm:max-w-7xl max-h-[95vh] overflow-hidden p-0">
          <DialogHeader className="p-4 sm:p-6">
            <DialogTitle className="flex items-center justify-between">
              <span className="text-lg sm:text-xl">Résultats d'évaluation ({prospects?.length || 0})</span>
              <Button onClick={onClose} variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col lg:flex-row h-[calc(95vh-120px)]">
            {/* Liste des prospects */}
            <div className="w-full lg:w-1/3 border-b lg:border-b-0 lg:border-r bg-gray-50 overflow-y-auto max-h-[300px] lg:max-h-none">
              <div className="p-3 sm:p-4 space-y-3">
                {isLoadingSheets ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-sm text-gray-500">Chargement des prospects...</p>
                  </div>
                ) : !prospects || prospects.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <h3 className="font-semibold text-gray-600 mb-2">Aucun prospect disponible</h3>
                    <p className="text-sm text-gray-500">Ajoutez des prospects pour voir leurs évaluations</p>
                  </div>
                ) : (
                  (prospects || []).map((prospect) => {
                    const score = getScoreFromProspect(prospect);
                    return (
                      <Card 
                        key={prospect.id}
                        className={`cursor-pointer transition-colors hover:shadow-md ${
                          selectedProspect?.id === prospect.id ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-white'
                        }`}
                        onClick={() => setSelectedProspect(prospect)}
                      >
                        <CardContent className="p-2 sm:p-3">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-xs sm:text-sm truncate">
                                {prospect.contact_name || prospect['Nom du contact'] || 'Contact non défini'}
                              </h4>
                              <p className="text-xs text-gray-600 truncate">
                                {prospect.company_name || prospect['Nom de l\'entreprise'] || 'Entreprise non définie'}
                              </p>
                              {prospect['Rôle'] && (
                                <p className="text-xs text-blue-600 truncate flex items-center gap-1">
                                  <Briefcase className="w-3 h-3" />
                                  <span className="hidden sm:inline">{prospect['Rôle']}</span>
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex gap-1 sm:gap-2 flex-wrap">
                              {prospect.Run === 'true' && (
                                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                  Actif
                                </Badge>
                              )}
                              {score > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  Évalué
                                </Badge>
                              )}
                            </div>
                            {score > 0 && (
                              <span className={`text-xs sm:text-sm font-medium ${getScoreColor(score)}`}>
                                {score}%
                              </span>
                            )}
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <div className="flex gap-1">
                              {prospect.linkedin_contact_url && (
                                <Linkedin className="w-3 h-3 text-blue-600" />
                              )}
                              {prospect.company_website && (
                                <Globe className="w-3 h-3 text-green-600" />
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </div>

            {/* Détails du prospect sélectionné */}
            <div className="flex-1 overflow-y-auto">
              {!prospects || prospects.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500 p-4">
                  <div className="text-center">
                    <Users className="w-12 sm:w-16 h-12 sm:h-16 mx-auto mb-4 sm:mb-6 text-gray-300" />
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-600 mb-2 sm:mb-3">Aucun prospect disponible</h3>
                    <p className="text-sm sm:text-base text-gray-500 mb-4 sm:mb-6">Ajoutez des prospects pour voir leurs évaluations</p>
                    <div className="bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-200 max-w-md">
                      <h4 className="font-semibold text-blue-900 mb-2">Pour commencer :</h4>
                      <ol className="text-xs sm:text-sm text-blue-800 space-y-1 text-left">
                        <li>1. Ajoutez un prospect</li>
                        <li>2. Activez-le pour l'évaluation</li>
                        <li>3. Lancez l'analyse IA</li>
                      </ol>
                    </div>
                  </div>
                </div>
              ) : selectedProspect ? (
                <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
                  {/* En-tête du prospect */}
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-3 sm:p-4 lg:p-6 rounded-lg border">
                    <div className="flex flex-col sm:flex-row justify-between items-start mb-4 gap-3">
                      <div className="flex-1">
                        <h3 className="text-base sm:text-lg font-semibold mb-1">
                          {selectedProspect.contact_name || selectedProspect['Nom du contact'] || 'Contact non défini'}
                        </h3>
                        <p className="text-sm sm:text-base text-gray-600 mb-2">
                          {selectedProspect.company_name || selectedProspect['Nom de l\'entreprise'] || 'Entreprise non définie'}
                        </p>
                        {selectedProspect['Rôle'] && (
                          <div className="flex items-center gap-2 mb-3">
                            <Briefcase className="w-4 h-4 text-blue-600" />
                            <span className="text-sm sm:text-base text-blue-800 font-medium">{selectedProspect['Rôle']}</span>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2 sm:gap-3 text-sm">
                          {selectedProspect.linkedin_contact_url && (
                            <a 
                              href={selectedProspect.linkedin_contact_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-blue-600 hover:underline hover:bg-blue-100 px-2 py-1 rounded transition-colors"
                            >
                              <Linkedin className="w-3 h-3" />
                              <span className="hidden sm:inline">LinkedIn</span>
                            </a>
                          )}
                          {selectedProspect.company_website && (
                            <a 
                              href={selectedProspect.company_website} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-green-600 hover:underline hover:bg-green-100 px-2 py-1 rounded transition-colors"
                            >
                              <Globe className="w-3 h-3" />
                              <span className="hidden sm:inline">Site web</span>
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="text-center sm:text-right">
                        {getScoreFromProspect(selectedProspect) > 0 && (
                          <>
                            <div className={`text-xl sm:text-2xl font-bold ${getScoreColor(getScoreFromProspect(selectedProspect))}`}>
                              {getScoreFromProspect(selectedProspect)}%
                            </div>
                            <Badge 
                              variant="outline" 
                              className={getScoreColor(getScoreFromProspect(selectedProspect)) === 'text-green-600' ? 'bg-green-100 text-green-800 border-green-200' : 
                                        getScoreColor(getScoreFromProspect(selectedProspect)) === 'text-yellow-600' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : 
                                        'bg-red-100 text-red-800 border-red-200'}
                            >
                              <Star className="w-3 h-3 mr-1" />
                              <span className="hidden sm:inline">Pertinence</span>
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* Barre de progression de la pertinence */}
                    {getScoreFromProspect(selectedProspect) > 0 && (
                      <div className="mt-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs sm:text-sm font-medium text-gray-700">Score de pertinence</span>
                          <span className="text-xs sm:text-sm text-gray-500">{getScoreFromProspect(selectedProspect)}/100</span>
                        </div>
                        <Progress 
                          value={getScoreFromProspect(selectedProspect)} 
                          className="h-2 sm:h-3"
                        />
                      </div>
                    )}
                  </div>

                  {/* Documents de préparation d'appel */}
                  {selectedProspect['Préparation de l\'appel'] && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <FileText className="w-4 h-4" />
                          Préparation d'Appel IA
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button
                            onClick={() => downloadPDF(
                              selectedProspect['Préparation de l\'appel'], 
                              `preparation-appel-${selectedProspect.contact_name || 'prospect'}.pdf`
                            )}
                            variant="default"
                            size="sm"
                            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white"
                          >
                            <Download className="w-4 h-4" />
                            Télécharger PDF
                          </Button>
                          <Button
                            onClick={() => window.open(selectedProspect['Préparation de l\'appel'], '_blank')}
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Ouvrir dans Google Docs
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Explication de l'évaluation */}
                  {selectedProspect.explanation && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <MessageSquare className="w-4 h-4" />
                          Justification de l'Évaluation
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {selectedProspect.explanation}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Informations du prospect */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                        <User className="w-4 h-4" />
                        Informations du Prospect
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <span className="font-medium text-xs sm:text-sm">Nom:</span>
                          <div className="text-xs sm:text-sm text-gray-700">
                            {selectedProspect.contact_name || selectedProspect['Nom du contact'] || 'Non défini'}
                          </div>
                        </div>
                        <div>
                          <span className="font-medium text-xs sm:text-sm">Entreprise:</span>
                          <div className="text-xs sm:text-sm text-gray-700">
                            {selectedProspect.company_name || selectedProspect['Nom de l\'entreprise'] || 'Non définie'}
                          </div>
                        </div>
                        {selectedProspect['Rôle'] && (
                          <div>
                            <span className="font-medium text-xs sm:text-sm">Rôle:</span>
                            <div className="text-xs sm:text-sm text-gray-700">{selectedProspect['Rôle']}</div>
                          </div>
                        )}
                        {selectedProspect.email && (
                          <div>
                            <span className="font-medium text-xs sm:text-sm">Email:</span>
                            <div className="text-xs sm:text-sm text-gray-700">{selectedProspect.email}</div>
                          </div>
                        )}
                        {selectedProspect.phone && (
                          <div>
                            <span className="font-medium text-xs sm:text-sm">Téléphone:</span>
                            <div className="text-xs sm:text-sm text-gray-700">{selectedProspect.phone}</div>
                          </div>
                        )}
                      </div>

                      {/* Liens interactifs */}
                      <div className="flex flex-wrap gap-2 sm:gap-3 pt-4 border-t">
                        {selectedProspect.linkedin_contact_url && (
                          <Button
                            onClick={() => window.open(selectedProspect.linkedin_contact_url, '_blank')}
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                          >
                            <Linkedin className="w-4 h-4" />
                            <span className="hidden sm:inline">Profil LinkedIn</span>
                            <span className="sm:hidden">LinkedIn</span>
                          </Button>
                        )}
                        {selectedProspect.company_website && (
                          <Button
                            onClick={() => window.open(selectedProspect.company_website, '_blank')}
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2 text-green-600 border-green-200 hover:bg-green-50"
                          >
                            <Globe className="w-4 h-4" />
                            <span className="hidden sm:inline">Site Web</span>
                            <span className="sm:hidden">Site</span>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Statut d'évaluation */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                        <TrendingUp className="w-4 h-4" />
                        État de l'Évaluation
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <span className="text-xs sm:text-sm font-medium">Status d'activation:</span>
                        <Badge 
                          variant="outline" 
                          className={selectedProspect.Run === 'true' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}
                        >
                          {selectedProspect.Run === 'true' ? 'Actif' : 'Inactif'}
                        </Badge>
                      </div>
                      {getScoreFromProspect(selectedProspect) > 0 && (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <span className="text-xs sm:text-sm font-medium">Score de pertinence:</span>
                          <Badge 
                            variant="outline" 
                            className={getScoreColor(getScoreFromProspect(selectedProspect)) === 'text-green-600' ? 'bg-green-100 text-green-800 border-green-200' : 
                                      getScoreColor(getScoreFromProspect(selectedProspect)) === 'text-yellow-600' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : 
                                      'bg-red-100 text-red-800 border-red-200'}
                          >
                            {getScoreFromProspect(selectedProspect)}%
                          </Badge>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 p-4">
                  <div className="text-center">
                    <Users className="w-12 sm:w-16 h-12 sm:h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-sm sm:text-base">Sélectionnez un prospect pour voir les détails</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Modal de prévisualisation du document */}
          {showDocumentPreview && selectedProspect?.['Préparation de l\'appel'] && (
            <DocumentPreview
              documentUrl={selectedProspect['Préparation de l\'appel']}
              isOpen={showDocumentPreview}
              onClose={() => setShowDocumentPreview(false)}
              title={`Document d'évaluation - ${selectedProspect.contact_name || selectedProspect['Nom du contact']}`}
            />
          )}

          {/* Viewer d'historique */}
          {showHistoryViewer && evaluationHistory.has(showHistoryViewer) && (
            <EvaluationHistoryViewer
              history={evaluationHistory.get(showHistoryViewer)!}
              onClose={() => setShowHistoryViewer(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};