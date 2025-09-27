import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
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
  History as HistoryIcon
} from 'lucide-react';
import { EvaluationResult, EvaluationHistory } from '@/types/evaluation';
import { DocumentPreview } from './DocumentPreview';
import { EvaluationHistoryViewer } from './EvaluationHistoryViewer';

interface EvaluationResultsViewerProps {
  results: EvaluationResult[];
  evaluationHistory: Map<string, EvaluationHistory>;
  onClose: () => void;
}

export const EvaluationResultsViewer: React.FC<EvaluationResultsViewerProps> = ({
  results,
  evaluationHistory,
  onClose
}) => {
  const [selectedResult, setSelectedResult] = useState<EvaluationResult | null>(
    results.length > 0 ? results[0] : null
  );
  const [showDocumentPreview, setShowDocumentPreview] = useState(false);
  const [showHistoryViewer, setShowHistoryViewer] = useState<string | null>(null);

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Résultats d'évaluation ({results.length})</span>
              <Button onClick={onClose} variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="flex h-[calc(90vh-120px)]">
            {/* Liste des résultats */}
            <div className="w-1/3 border-r bg-gray-50 overflow-y-auto">
              <div className="p-4 space-y-3">
                {results.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <h3 className="font-semibold text-gray-600 mb-2">Pas de contenu disponible</h3>
                    <p className="text-sm text-gray-500">Aucun prospect n'a encore été évalué</p>
                  </div>
                ) : (
                  results.map((result) => (
                    <Card 
                      key={result.id}
                      className={`cursor-pointer transition-colors hover:shadow-md ${
                        selectedResult?.id === result.id ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-white'
                      }`}
                      onClick={() => setSelectedResult(result)}
                    >
                      <CardContent className="p-3">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm truncate">{result.prospect.contact_name}</h4>
                            <p className="text-xs text-gray-600 truncate">{result.prospect.company_name}</p>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex gap-2">
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getOpportunityLevelColor(result.analysis.opportunity_level)}`}
                            >
                              {result.analysis.opportunity_level === 'high' ? 'Élevé' : 
                               result.analysis.opportunity_level === 'medium' ? 'Moyen' : 'Faible'}
                            </Badge>
                            {result.version && (
                              <Badge variant="secondary" className="text-xs">
                                v{result.version}
                              </Badge>
                            )}
                          </div>
                          <span className={`text-sm font-medium ${getScoreColor(result.analysis.relevance_score)}`}>
                            {result.analysis.relevance_score}%
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(result.metadata.generated_at).toLocaleDateString('fr-FR')}
                          </div>
                          {evaluationHistory.has(result.prospect.id) && (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowHistoryViewer(result.prospect.id);
                              }}
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-blue-600 hover:bg-blue-100"
                            >
                              <HistoryIcon className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>

            {/* Détails du résultat sélectionné */}
            <div className="flex-1 overflow-y-auto">
              {results.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <AlertCircle className="w-16 h-16 mx-auto mb-6 text-gray-300" />
                    <h3 className="text-xl font-semibold text-gray-600 mb-3">Pas de contenu disponible</h3>
                    <p className="text-gray-500 mb-6">Aucun prospect n'a encore été évalué par l'IA</p>
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 max-w-md">
                      <h4 className="font-semibold text-blue-900 mb-2">Pour commencer :</h4>
                      <ol className="text-sm text-blue-800 space-y-1 text-left">
                        <li>1. Ajoutez un prospect</li>
                        <li>2. Activez-le pour l'évaluation</li>
                        <li>3. Lancez l'analyse IA</li>
                      </ol>
                    </div>
                  </div>
                </div>
              ) : selectedResult ? (
                <div className="p-6 space-y-6">
                  {/* En-tête du prospect */}
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold mb-1">{selectedResult.prospect.contact_name}</h3>
                        <p className="text-gray-600 mb-2">{selectedResult.prospect.company_name}</p>
                        <div className="flex gap-3 text-sm">
                          {selectedResult.prospect.linkedin_url && (
                            <a 
                              href={selectedResult.prospect.linkedin_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-blue-600 hover:underline"
                            >
                              <User className="w-3 h-3" />
                              LinkedIn
                            </a>
                          )}
                          {selectedResult.prospect.website && (
                            <a 
                              href={selectedResult.prospect.website} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-blue-600 hover:underline"
                            >
                              <Building className="w-3 h-3" />
                              Site web
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${getScoreColor(selectedResult.analysis.relevance_score)}`}>
                          {selectedResult.analysis.relevance_score}%
                        </div>
                        <Badge 
                          variant="outline" 
                          className={getOpportunityLevelColor(selectedResult.analysis.opportunity_level)}
                        >
                          Niveau {selectedResult.analysis.opportunity_level === 'high' ? 'élevé' : 
                                  selectedResult.analysis.opportunity_level === 'medium' ? 'moyen' : 'faible'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Documents générés */}
                  {selectedResult.documents.google_doc_url && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <FileText className="w-4 h-4" />
                          Documents générés
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex gap-2">
                          <Button
                            onClick={() => setShowDocumentPreview(true)}
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2"
                          >
                            <FileText className="w-4 h-4" />
                            Visualiser
                          </Button>
                          <Button
                            onClick={() => window.open(selectedResult.documents.google_doc_url, '_blank')}
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

                  {/* Insights clés */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <TrendingUp className="w-4 h-4" />
                        Insights clés
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {selectedResult.analysis.key_insights.map((insight, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <ChevronRight className="w-4 h-4 mt-0.5 text-blue-600 flex-shrink-0" />
                            <span className="text-sm">{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  {/* Points de discussion */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Points de discussion recommandés</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {selectedResult.analysis.discussion_points.map((point, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <ChevronRight className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
                            <span className="text-sm">{point}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  {/* Stratégie d'approche */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Stratégie d'approche</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-700">
                        {selectedResult.analysis.approach_strategy}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Recommandations d'appel */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Recommandations pour l'appel</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {selectedResult.analysis.call_recommendations.map((rec, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <ChevronRight className="w-4 h-4 mt-0.5 text-purple-600 flex-shrink-0" />
                            <span className="text-sm">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  {/* Métadonnées */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Informations sur l'analyse</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Date de génération:</span>
                          <div className="text-gray-600">
                            {new Date(selectedResult.metadata.generated_at).toLocaleDateString('fr-FR')}
                          </div>
                        </div>
                        <div>
                          <span className="font-medium">Temps de traitement:</span>
                          <div className="text-gray-600">
                            {selectedResult.metadata.processing_time}s
                          </div>
                        </div>
                      </div>
                      <div>
                        <span className="font-medium">Sources de données:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedResult.metadata.data_sources.map((source, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {source}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p>Sélectionnez un résultat pour voir les détails</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Modal de prévisualisation du document */}
          {showDocumentPreview && selectedResult?.documents.google_doc_url && (
            <DocumentPreview
              documentUrl={selectedResult.documents.google_doc_url}
              isOpen={showDocumentPreview}
              onClose={() => setShowDocumentPreview(false)}
              title={`Document d'évaluation - ${selectedResult.prospect.contact_name}`}
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