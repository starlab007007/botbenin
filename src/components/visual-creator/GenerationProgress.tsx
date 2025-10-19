import { useState } from 'react';
import { Check, X, RefreshCw, Play, Eye, Download, Loader2, Save, Edit, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface GenerationStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  result?: {
    image?: string;
    data?: any;
  };
  error?: string;
}

interface GenerationProgressProps {
  steps: GenerationStep[];
  currentStepIndex: number;
  onRegenerateStep: (stepId: string) => void;
  onContinue: () => void;
  onViewResult: (stepId: string) => void;
  onSaveStep?: (stepId: string, imageUrl: string) => void;
  onEditStep?: (stepId: string) => void;
}

export const GenerationProgress = ({
  steps,
  currentStepIndex,
  onRegenerateStep,
  onContinue,
  onViewResult,
  onSaveStep,
  onEditStep
}: GenerationProgressProps) => {
  const [previewStep, setPreviewStep] = useState<GenerationStep | null>(null);
  const [savedSteps, setSavedSteps] = useState<Set<string>>(new Set());

  const handleDownloadImage = async (imageUrl: string, stepTitle: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${stepTitle.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Téléchargement réussi !');
    } catch (error) {
      toast.error('Erreur lors du téléchargement');
    }
  };

  const getStatusIcon = (status: GenerationStep['status']) => {
    switch (status) {
      case 'completed':
        return <Check className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'processing':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: GenerationStep['status']) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500">✓ Terminé</Badge>;
      case 'error':
        return <Badge variant="destructive">✗ Erreur</Badge>;
      case 'processing':
        return <Badge className="bg-blue-500"><Loader2 className="w-3 h-3 inline-block animate-spin mr-1" />En cours</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 inline-block mr-1" />En attente</Badge>;
    }
  };

  const getStepInstruction = (step: GenerationStep, index: number) => {
    if (step.status === 'completed') {
      if (index === steps.length - 1) {
        return "✅ Vidéo terminée ! Vous pouvez la visualiser, télécharger ou partager.";
      }
      return "✅ Étape terminée ! Cliquez sur 'Continuer' pour passer à l'étape suivante.";
    }
    if (step.status === 'processing') {
      return "⏳ Génération en cours, veuillez patienter...";
    }
    if (step.status === 'error') {
      return "❌ Une erreur s'est produite. Cliquez sur 'Réessayer' pour régénérer cette étape.";
    }
    return "⏸️ Cette étape sera exécutée après les précédentes.";
  };

  const handleSaveStep = async (stepId: string, imageUrl: string) => {
    if (onSaveStep) {
      await onSaveStep(stepId, imageUrl);
      setSavedSteps(prev => new Set(prev).add(stepId));
      toast.success('Étape sauvegardée dans votre galerie !');
    }
  };

  const getStatusColor = (status: GenerationStep['status']) => {
    switch (status) {
      case 'completed':
        return 'border-green-500 bg-green-50';
      case 'error':
        return 'border-red-500 bg-red-50';
      case 'processing':
        return 'border-blue-500 bg-blue-50';
      default:
        return 'border-gray-300 bg-gray-50';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Progression de la génération</h3>
        <Badge variant="outline" className="text-base px-3 py-1">
          Étape {currentStepIndex + 1} / {steps.length}
        </Badge>
      </div>
      
      <div className="space-y-4">
        {steps.map((step, index) => (
          <Card key={step.id} className={`p-4 md:p-5 border-2 transition-all ${getStatusColor(step.status)}`}>
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <div className="flex-shrink-0 mt-1">
                {getStatusIcon(step.status)}
              </div>
              
              <div className="flex-1 min-w-0 w-full space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-foreground">
                      {index + 1}. {step.title}
                    </h4>
                    {savedSteps.has(step.id) && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Save className="w-3 h-3" /> Sauvegardé
                      </Badge>
                    )}
                  </div>
                  {getStatusBadge(step.status)}
                </div>
                
                <p className="text-sm text-muted-foreground">
                  {step.description}
                </p>

                {/* Instruction utilisateur */}
                <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-sm">
                  <p className="font-medium text-primary">{getStepInstruction(step, index)}</p>
                </div>

                {step.error && (
                  <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive mb-3">
                    <p className="font-medium mb-1">❌ Une erreur s'est produite. Cliquez sur "Réessayer" pour régénérer cette étape.</p>
                    <details className="mt-2">
                      <summary className="cursor-pointer hover:underline text-xs">Détails de l'erreur</summary>
                      <p className="mt-1 text-xs opacity-80">{step.error}</p>
                    </details>
                  </div>
                )}

                {step.result?.image && step.id !== 'animate-video' && (
                  <div className="mb-3 rounded-lg overflow-hidden border bg-muted">
                    <img 
                      src={step.result.image} 
                      alt={step.title}
                      className="w-full h-40 sm:h-48 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setPreviewStep(step)}
                    />
                  </div>
                )}

                {step.result?.image && step.id === 'animate-video' && (
                  <div className="mb-3 rounded-lg overflow-hidden border bg-black">
                    <video
                      src={step.result.image}
                      controls
                      className="w-full h-auto"
                    >
                      Votre navigateur ne supporte pas la lecture vidéo.
                    </video>
                  </div>
                )}

                {/* Actions */}
                {step.status === 'completed' && (
                  <div className="flex flex-wrap gap-2">
                    {step.result?.image && step.id !== 'animate-video' && !savedSteps.has(step.id) && onSaveStep && (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleSaveStep(step.id, step.result.image!)}
                        className="gap-2"
                      >
                        <Save className="w-4 h-4" />
                        Sauvegarder
                      </Button>
                    )}
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPreviewStep(step)}
                      className="gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      <span className="hidden sm:inline">Visualiser</span>
                    </Button>
                    
                    {step.result?.image && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadImage(step.result.image!, step.title)}
                        className="gap-2"
                      >
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">Télécharger</span>
                      </Button>
                    )}
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onRegenerateStep(step.id)}
                      className="gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span className="hidden sm:inline">Régénérer</span>
                    </Button>

                    {onEditStep && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onEditStep(step.id)}
                        className="gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        <span className="hidden sm:inline">Modifier</span>
                      </Button>
                    )}

                    {step.status === 'completed' && index === currentStepIndex && index < steps.length - 1 && (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onContinue();
                        }}
                        className="gap-2 ml-auto bg-primary hover:bg-primary/90"
                      >
                        <Play className="w-4 h-4" />
                        Continuer →
                      </Button>
                    )}
                  </div>
                )}

                {step.status === 'error' && (
                  <Button
                    size="sm"
                    onClick={() => onRegenerateStep(step.id)}
                    className="gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Réessayer
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Preview Dialog - Responsive and Full-Featured */}
      <Dialog open={!!previewStep} onOpenChange={(open) => !open && setPreviewStep(null)}>
        <DialogContent className="max-w-[95vw] w-full h-[95vh] md:max-w-5xl md:h-[90vh] p-0 gap-0">
          <DialogHeader className="p-4 md:p-6 border-b">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <DialogTitle className="text-lg md:text-xl">{previewStep?.title}</DialogTitle>
              <div className="flex gap-2 flex-wrap">
                {previewStep?.result?.image && previewStep.id !== 'animate-video' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownloadImage(previewStep.result.image!, previewStep.title)}
                    className="gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Télécharger</span>
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto bg-muted/30 p-4 md:p-6">
            {previewStep?.result?.image && previewStep.id !== 'animate-video' && (
              <div className="flex items-center justify-center min-h-full">
                <img 
                  src={previewStep.result.image} 
                  alt={previewStep.title}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                />
              </div>
            )}

            {previewStep?.result?.image && previewStep.id === 'animate-video' && (
              <div className="flex items-center justify-center min-h-full">
                <video
                  src={previewStep.result.image}
                  controls
                  autoPlay
                  loop
                  className="max-w-full max-h-full rounded-lg shadow-lg"
                >
                  Votre navigateur ne supporte pas la lecture vidéo.
                </video>
              </div>
            )}

            {previewStep?.result?.data && (
              <pre className="p-4 bg-background rounded-lg text-sm overflow-auto max-h-[70vh]">
                {JSON.stringify(previewStep.result.data, null, 2)}
              </pre>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
