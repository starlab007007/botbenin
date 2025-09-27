import React, { useState } from 'react';
import { EvaluationResult } from '@/types/evaluation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { DocumentPreview } from './DocumentPreview';
import { 
  FileText, 
  Download, 
  Eye, 
  ExternalLink, 
  Clock, 
  CheckCircle,
  AlertCircle,
  User,
  Building,
  Globe,
  Linkedin,
  Target,
  TrendingUp,
  MessageSquare,
  Star,
  ArrowRight,
  X
} from 'lucide-react';

interface EvaluationResultsViewerProps {
  results: EvaluationResult[];
  isOpen: boolean;
  onClose: () => void;
}

export const EvaluationResultsViewer: React.FC<EvaluationResultsViewerProps> = ({
  results,
  isOpen,
  onClose
}) => {
  const [selectedResult, setSelectedResult] = useState<EvaluationResult | null>(null);
  const [showDocumentPreview, setShowDocumentPreview] = useState(false);

  if (!isOpen) return null;

  const getOpportunityColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="w-full max-w-7xl mx-4 h-[90vh] bg-white rounded-lg shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <FileText className="w-6 h-6 text-blue-600" />
              Résultats d'Évaluation IA
            </h2>
            <p className="text-muted-foreground">
              {results.length} résultat{results.length > 1 ? 's' : ''} d'analyse
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex flex-1 overflow-hidden">
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
                    selectedResult?.id === result.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                  }`}
                  onClick={() => setSelectedResult(result)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {result.prospect.contact_name}
                        </h3>
                        <p className="text-sm text-gray-600 truncate">
                          {result.prospect.company_name}
                        </p>
                      </div>
                      <Badge className={getOpportunityColor(result.analysis.opportunity_level)}>
                        {result.analysis.opportunity_level === 'high' && 'Fort'}
                        {result.analysis.opportunity_level === 'medium' && 'Moyen'}
                        {result.analysis.opportunity_level === 'low' && 'Faible'}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      {formatDate(result.metadata.generated_at)}
                    </div>
                    
                    <div className="mt-2 flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm font-medium">
                        {result.analysis.relevance_score}/100
                      </span>
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
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-1">
                        {selectedResult.prospect.contact_name}
                      </h2>
                      <p className="text-lg text-gray-600 flex items-center gap-2">
                        <Building className="w-4 h-4" />
                        {selectedResult.prospect.company_name}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge className={`${getOpportunityColor(selectedResult.analysis.opportunity_level)} text-sm px-3 py-1`}>
                        Opportunité {selectedResult.analysis.opportunity_level === 'high' ? 'Forte' : 
                          selectedResult.analysis.opportunity_level === 'medium' ? 'Moyenne' : 'Faible'}
                      </Badge>
                      <div className="mt-2 flex items-center gap-1 text-right">
                        <Star className="w-5 h-5 text-yellow-500" />
                        <span className="text-xl font-bold text-gray-900">
                          {selectedResult.analysis.relevance_score}/100
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    {selectedResult.prospect.linkedin_url && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={selectedResult.prospect.linkedin_url} target="_blank" rel="noopener noreferrer">
                          <Linkedin className="w-4 h-4 mr-2" />
                          LinkedIn
                        </a>
                      </Button>
                    )}
                    {selectedResult.prospect.website && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={selectedResult.prospect.website} target="_blank" rel="noopener noreferrer">
                          <Globe className="w-4 h-4 mr-2" />
                          Site web
                        </a>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Documents générés */}
                {(selectedResult.documents.google_doc_url || selectedResult.documents.pdf_url) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-green-600" />
                        Documents générés
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {selectedResult.documents.google_doc_url && (
                          <div className="p-4 border rounded-lg bg-blue-50">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-blue-900">Google Document</h4>
                              <Badge variant="secondary">Éditable</Badge>
                            </div>
                            <p className="text-sm text-blue-700 mb-3">
                              Document complet avec analyse détaillée
                            </p>
                            <div className="flex gap-2">
                              <Button size="sm" asChild>
                                <a href={selectedResult.documents.google_doc_url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="w-4 h-4 mr-2" />
                                  Ouvrir
                                </a>
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => setShowDocumentPreview(true)}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                Aperçu
                              </Button>
                            </div>
                          </div>
                        )}
                        
                        {selectedResult.documents.pdf_url && (
                          <div className="p-4 border rounded-lg bg-green-50">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-green-900">Rapport PDF</h4>
                              <Badge variant="secondary">Téléchargeable</Badge>
                            </div>
                            <p className="text-sm text-green-700 mb-3">
                              Version PDF pour présentation
                            </p>
                            <div className="flex gap-2">
                              <Button size="sm" asChild>
                                <a href={selectedResult.documents.pdf_url} download>
                                  <Download className="w-4 h-4 mr-2" />
                                  Télécharger
                                </a>
                              </Button>
                              <Button size="sm" variant="outline" asChild>
                                <a href={selectedResult.documents.pdf_url} target="_blank" rel="noopener noreferrer">
                                  <Eye className="w-4 h-4 mr-2" />
                                  Visualiser
                                </a>
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Insights clés */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-purple-600" />
                      Insights clés
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3">
                      {selectedResult.analysis.key_insights.map((insight, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                          <CheckCircle className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                          <span className="text-purple-900">{insight}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Points de discussion */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-blue-600" />
                      Points de discussion
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {selectedResult.analysis.discussion_points.map((point, index) => (
                        <div key={index} className="flex items-start gap-3">
                          <ArrowRight className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-700">{point}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Stratégie d'approche */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                      Stratégie d'approche
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      {selectedResult.analysis.approach_strategy}
                    </p>
                    
                    <Separator className="my-4" />
                    
                    <h4 className="font-semibold text-gray-900 mb-3">Recommandations pour l'appel :</h4>
                    <div className="space-y-2">
                      {selectedResult.analysis.call_recommendations.map((rec, index) => (
                        <div key={index} className="flex items-start gap-3">
                          <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-700">{rec}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Métadonnées */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm text-gray-600">Informations de traitement</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Généré le :</span>
                        <p className="font-medium">{formatDate(selectedResult.metadata.generated_at)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Temps de traitement :</span>
                        <p className="font-medium">{selectedResult.metadata.processing_time}s</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-500">Sources de données :</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedResult.metadata.data_sources.map((source, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {source}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Sélectionnez un résultat pour voir les détails</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Document Preview Modal */}
      {showDocumentPreview && selectedResult?.documents.google_doc_url && (
        <DocumentPreview
          documentUrl={selectedResult.documents.google_doc_url}
          isOpen={showDocumentPreview}
          onClose={() => setShowDocumentPreview(false)}
          title={`Rapport - ${selectedResult.prospect.contact_name}`}
        />
      )}
    </div>
  );
};