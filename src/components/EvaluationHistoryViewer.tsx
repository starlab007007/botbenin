import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar, 
  Clock, 
  FileText, 
  TrendingUp, 
  User, 
  Building, 
  ChevronRight,
  History,
  ExternalLink,
  Download
} from 'lucide-react';
import { EvaluationHistory, EvaluationResult } from '@/types/evaluation';
import { DocumentPreview } from './DocumentPreview';

interface EvaluationHistoryViewerProps {
  history: EvaluationHistory;
  onClose: () => void;
}

export const EvaluationHistoryViewer: React.FC<EvaluationHistoryViewerProps> = ({
  history,
  onClose
}) => {
  const [selectedEvaluation, setSelectedEvaluation] = useState<EvaluationResult>(
    history.currentEvaluation || history.evaluations[0]
  );
  const [showDocumentPreview, setShowDocumentPreview] = useState(false);

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
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Historique des évaluations - {history.evaluations[0]?.prospect.contact_name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex h-[calc(90vh-120px)]">
          {/* Liste des évaluations */}
          <div className="w-1/3 border-r bg-gray-50 overflow-y-auto">
            <div className="p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Évaluations ({history.evaluations.length})
              </h3>
              
              <div className="space-y-3">
                {history.evaluations
                  .sort((a, b) => new Date(b.metadata.generated_at).getTime() - new Date(a.metadata.generated_at).getTime())
                  .map((evaluation) => (
                  <Card 
                    key={evaluation.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedEvaluation.id === evaluation.id 
                        ? 'ring-2 ring-blue-500 bg-blue-50' 
                        : 'hover:bg-white'
                    }`}
                    onClick={() => setSelectedEvaluation(evaluation)}
                  >
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start mb-2">
                        <Badge 
                          variant="outline" 
                          className="text-xs"
                        >
                          v{evaluation.version || 1}
                        </Badge>
                        {evaluation.id === history.currentEvaluation?.id && (
                          <Badge className="text-xs bg-green-100 text-green-800">
                            Actuelle
                          </Badge>
                        )}
                      </div>
                      
                      <div className="text-sm mb-2">
                        <div className="font-medium mb-1">
                          Score: <span className={getScoreColor(evaluation.analysis.relevance_score)}>
                            {evaluation.analysis.relevance_score}%
                          </span>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getOpportunityLevelColor(evaluation.analysis.opportunity_level)}`}
                        >
                          {evaluation.analysis.opportunity_level === 'high' ? 'Élevé' : 
                           evaluation.analysis.opportunity_level === 'medium' ? 'Moyen' : 'Faible'}
                        </Badge>
                      </div>
                      
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(evaluation.metadata.generated_at).toLocaleDateString('fr-FR')} à {' '}
                        {new Date(evaluation.metadata.generated_at).toLocaleTimeString('fr-FR', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          {/* Détails de l'évaluation sélectionnée */}
          <div className="flex-1 overflow-y-auto">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-6">
                {/* En-tête */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-1">
                        Évaluation v{selectedEvaluation.version || 1}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {selectedEvaluation.prospect.contact_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Building className="w-4 h-4" />
                          {selectedEvaluation.prospect.company_name}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${getScoreColor(selectedEvaluation.analysis.relevance_score)}`}>
                        {selectedEvaluation.analysis.relevance_score}%
                      </div>
                      <Badge 
                        variant="outline" 
                        className={getOpportunityLevelColor(selectedEvaluation.analysis.opportunity_level)}
                      >
                        Niveau {selectedEvaluation.analysis.opportunity_level === 'high' ? 'élevé' : 
                                selectedEvaluation.analysis.opportunity_level === 'medium' ? 'moyen' : 'faible'}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Documents générés */}
                {selectedEvaluation.documents.google_doc_url && (
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
                          onClick={() => window.open(selectedEvaluation.documents.google_doc_url, '_blank')}
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
                      {selectedEvaluation.analysis.key_insights.map((insight, index) => (
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
                      {selectedEvaluation.analysis.discussion_points.map((point, index) => (
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
                      {selectedEvaluation.analysis.approach_strategy}
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
                      {selectedEvaluation.analysis.call_recommendations.map((rec, index) => (
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
                          {new Date(selectedEvaluation.metadata.generated_at).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium">Temps de traitement:</span>
                        <div className="text-gray-600">
                          {selectedEvaluation.metadata.processing_time}s
                        </div>
                      </div>
                    </div>
                    <div>
                      <span className="font-medium">Sources de données:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedEvaluation.metadata.data_sources.map((source, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {source}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Modal de prévisualisation du document */}
        {showDocumentPreview && selectedEvaluation.documents.google_doc_url && (
          <DocumentPreview
            documentUrl={selectedEvaluation.documents.google_doc_url}
            isOpen={showDocumentPreview}
            onClose={() => setShowDocumentPreview(false)}
            title={`Document d'évaluation - ${selectedEvaluation.prospect.contact_name}`}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};