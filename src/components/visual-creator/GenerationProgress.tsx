import { useState } from 'react';
import { Check, X, RefreshCw, Play, Eye, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
}

export const GenerationProgress = ({
  steps,
  currentStepIndex,
  onRegenerateStep,
  onContinue,
  onViewResult
}: GenerationProgressProps) => {
  const [previewStep, setPreviewStep] = useState<GenerationStep | null>(null);

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
        return <X className="w-5 h-5 text-red-500" />;
      case 'processing':
        return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-gray-300" />;
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
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Progression de la génération</h3>
        <div className="text-sm text-muted-foreground">
          Étape {currentStepIndex + 1}/{steps.length}
        </div>
      </div>
      
      <div className="space-y-3">
        {steps.map((step, index) => (
          <Card key={step.id} className={`p-4 md:p-5 border-2 transition-all ${getStatusColor(step.status)}`}>
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <div className="flex-shrink-0 mt-1">
                {getStatusIcon(step.status)}
              </div>
              
              <div className="flex-1 min-w-0 w-full">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
                  <h4 className="font-medium text-foreground">
                    {index + 1}. {step.title}
                  </h4>
                  <span className="text-xs text-muted-foreground capitalize px-2 py-1 bg-background rounded-md">
                    {step.status === 'processing' && <Loader2 className="w-3 h-3 inline-block animate-spin mr-1" />}
                    {step.status === 'processing' ? 'En cours...' : 
                     step.status === 'completed' ? 'Completed' :
                     step.status === 'error' ? 'Échoué' : 'En attente'}
                  </span>
                </div>
                
                <p className="text-sm text-muted-foreground mb-3">
                  {step.description}
                </p>

                {step.error && (
                  <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive mb-3">
                    <p className="font-medium mb-1">Erreur:</p>
                    <p>{step.error}</p>
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
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPreviewStep(step)}
                      className="gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      <span className="hidden sm:inline">Visualiser</span>
                    </Button>
                    
                    {step.result?.image && step.id !== 'animate-video' && (
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

                    {index === currentStepIndex && index < steps.length - 1 && (
                      <Button
                        size="sm"
                        onClick={onContinue}
                        className="gap-2 ml-auto"
                      >
                        <Play className="w-4 h-4" />
                        Continuer
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

      {/* Preview Dialog */}
      <Dialog open={!!previewStep} onOpenChange={(open) => !open && setPreviewStep(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{previewStep?.title}</span>
              {previewStep?.result?.image && previewStep.id !== 'animate-video' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownloadImage(previewStep.result.image!, previewStep.title)}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Télécharger
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {previewStep?.result?.image && previewStep.id !== 'animate-video' && (
            <div className="rounded-lg overflow-hidden bg-muted">
              <img 
                src={previewStep.result.image} 
                alt={previewStep.title}
                className="w-full h-auto object-contain"
              />
            </div>
          )}

          {previewStep?.result?.image && previewStep.id === 'animate-video' && (
            <div className="rounded-lg overflow-hidden bg-black">
              <video
                src={previewStep.result.image}
                controls
                autoPlay
                loop
                className="w-full h-auto"
              >
                Votre navigateur ne supporte pas la lecture vidéo.
              </video>
            </div>
          )}

          {previewStep?.result?.data && (
            <pre className="p-4 bg-muted rounded-lg text-sm overflow-auto max-h-96">
              {JSON.stringify(previewStep.result.data, null, 2)}
            </pre>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
