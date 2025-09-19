import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { DocumentLinkViewer } from './DocumentLinkViewer';
import { useReportManager } from './ReportLinkManager';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Loader2, 
  FileText,
  Zap,
  BarChart3,
  Target,
  Sparkles
} from 'lucide-react';

interface EvaluationStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  progress?: number;
  startTime?: Date;
  endTime?: Date;
  icon: React.ReactNode;
}

interface ProspectEvaluationProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  prospectName: string;
  prospectId?: string;
  onCancel?: () => void;
}

export const ProspectEvaluationProgressModal: React.FC<ProspectEvaluationProgressModalProps> = ({
  isOpen,
  onClose,
  prospectName,
  prospectId,
  onCancel
}) => {
  const { addReport } = useReportManager();
  const [steps, setSteps] = useState<EvaluationStep[]>([
    {
      id: 'webhook',
      name: 'Déclenchement du Workflow',
      description: 'Envoi des données au système d\'évaluation',
      status: 'pending',
      icon: <Zap className="w-4 h-4" />
    },
    {
      id: 'analysis',
      name: 'Analyse du Prospect',
      description: 'Évaluation de la pertinence et du potentiel',
      status: 'pending',
      icon: <BarChart3 className="w-4 h-4" />
    },
    {
      id: 'research',
      name: 'Recherche Approfondie',
      description: 'Collecte d\'informations complémentaires',
      status: 'pending',
      icon: <Target className="w-4 h-4" />
    },
    {
      id: 'generation',
      name: 'Génération du Rapport',
      description: 'Création du rapport d\'évaluation final',
      status: 'pending',
      icon: <FileText className="w-4 h-4" />
    },
    {
      id: 'completion',
      name: 'Finalisation',
      description: 'Rapport prêt et sauvegardé',
      status: 'pending',
      icon: <Sparkles className="w-4 h-4" />
    }
  ]);

  const [currentStep, setCurrentStep] = useState(0);
  const [overallProgress, setOverallProgress] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportUrl, setReportUrl] = useState<string | null>(null);

  // Simulation du processus d'évaluation
  useEffect(() => {
    if (isOpen && !isRunning) {
      startEvaluation();
    }
  }, [isOpen]);

  const startEvaluation = async () => {
    setIsRunning(true);
    setError(null);
    
    try {
      // Étape 1: Déclenchement du webhook
      await processStep(0, 2000);
      
      // Étape 2: Analyse
      await processStep(1, 3000);
      
      // Étape 3: Recherche
      await processStep(2, 4000);
      
      // Étape 4: Génération
      await processStep(3, 3000);
      
      // Étape 5: Finalisation
      await processStep(4, 1000);
      
      // Simuler la génération d'un lien de rapport
      const simulatedReportUrl = `https://docs.google.com/document/d/1BcDefGhIjKlMnOpQrStUvWxYz/edit?usp=sharing`;
      setReportUrl(simulatedReportUrl);
      
      // Enregistrer automatiquement le rapport
      if (prospectId) {
        addReport(
          simulatedReportUrl,
          `Rapport d'évaluation - ${prospectName}`,
          prospectId,
          `Analyse complète du prospect ${prospectName} générée le ${new Date().toLocaleDateString('fr-FR')}`,
          'evaluation'
        );
      }
      
      setOverallProgress(100);
    } catch (err) {
      setError('Une erreur est survenue lors de l\'évaluation');
      setSteps(prev => prev.map((step, index) => 
        index === currentStep ? { ...step, status: 'error' } : step
      ));
    } finally {
      setIsRunning(false);
    }
  };

  const processStep = (stepIndex: number, duration: number): Promise<void> => {
    return new Promise((resolve) => {
      setCurrentStep(stepIndex);
      
      // Marquer l'étape comme en cours
      setSteps(prev => prev.map((step, index) => 
        index === stepIndex 
          ? { ...step, status: 'running', startTime: new Date() }
          : step
      ));

      // Simulation de progression
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress > 100) progress = 100;
        
        setSteps(prev => prev.map((step, index) => 
          index === stepIndex ? { ...step, progress } : step
        ));
        
        // Mise à jour du progrès global
        const globalProgress = ((stepIndex * 100) + progress) / steps.length;
        setOverallProgress(globalProgress);
        
        if (progress >= 100) {
          clearInterval(interval);
          
          // Marquer l'étape comme terminée
          setSteps(prev => prev.map((step, index) => 
            index === stepIndex 
              ? { ...step, status: 'completed', endTime: new Date(), progress: 100 }
              : step
          ));
          
          resolve();
        }
      }, duration / 20);
    });
  };

  const getStepStatusIcon = (step: EvaluationStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'running':
        return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStepStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'running':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const formatDuration = (start?: Date, end?: Date) => {
    if (!start) return '';
    const endTime = end || new Date();
    const duration = Math.floor((endTime.getTime() - start.getTime()) / 1000);
    return `${duration}s`;
  };

  const allCompleted = steps.every(step => step.status === 'completed');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Évaluation en cours - {prospectName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progression globale */}
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Progression globale
                </span>
                <span className="text-sm text-gray-500">
                  {Math.round(overallProgress)}%
                </span>
              </div>
              <Progress value={overallProgress} className="h-2" />
              
              {error && (
                <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 inline mr-2" />
                  {error}
                </div>
              )}
              
              {allCompleted && (
                <div className="mt-3 space-y-3">
                  <div className="p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                    <CheckCircle2 className="w-4 h-4 inline mr-2" />
                    Évaluation terminée avec succès !
                  </div>
                  
                  {reportUrl && (
                    <DocumentLinkViewer
                      url={reportUrl}
                      title={`Rapport d'évaluation - ${prospectName}`}
                      description="Analyse complète du prospect avec recommandations détaillées"
                      className="mt-3"
                    />
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Étapes détaillées */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-800">Étapes d'évaluation</h3>
            
            {steps.map((step, index) => (
              <Card 
                key={step.id} 
                className={`transition-all duration-300 ${
                  step.status === 'running' ? 'ring-2 ring-blue-200 shadow-md' : ''
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getStepStatusIcon(step)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                          {step.icon}
                          {step.name}
                        </h4>
                        <div className="flex items-center gap-2">
                          {step.startTime && (
                            <span className="text-xs text-gray-500">
                              {formatDuration(step.startTime, step.endTime)}
                            </span>
                          )}
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getStepStatusColor(step.status)}`}
                          >
                            {step.status === 'pending' && 'En attente'}
                            {step.status === 'running' && 'En cours'}
                            {step.status === 'completed' && 'Terminé'}
                            {step.status === 'error' && 'Erreur'}
                          </Badge>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-500 mt-1">
                        {step.description}
                      </p>
                      
                      {step.status === 'running' && step.progress !== undefined && (
                        <div className="mt-2">
                          <Progress value={step.progress} className="h-1" />
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Separator />

        <div className="flex justify-end gap-2">
          {isRunning && onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Annuler
            </Button>
          )}
          
          {allCompleted && (
            <Button onClick={onClose}>
              Fermer
            </Button>
          )}
          
          {!isRunning && !allCompleted && (
            <Button variant="outline" onClick={onClose}>
              Fermer
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};