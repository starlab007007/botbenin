import { useState } from 'react';
import { Check, X, RefreshCw, Play, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
      <h3 className="text-lg font-semibold text-foreground">Progression de la génération</h3>
      
      <div className="space-y-3">
        {steps.map((step, index) => (
          <Card key={step.id} className={`p-4 border-2 transition-all ${getStatusColor(step.status)}`}>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 mt-1">
                {getStatusIcon(step.status)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h4 className="font-medium text-foreground">
                    {index + 1}. {step.title}
                  </h4>
                  <span className="text-xs text-muted-foreground capitalize">
                    {step.status === 'processing' ? 'En cours...' : step.status}
                  </span>
                </div>
                
                <p className="text-sm text-muted-foreground mb-3">
                  {step.description}
                </p>

                {step.error && (
                  <div className="p-2 bg-red-100 border border-red-300 rounded text-sm text-red-700 mb-3">
                    {step.error}
                  </div>
                )}

                {step.result?.image && (
                  <div className="mb-3 rounded-lg overflow-hidden border">
                    <img 
                      src={step.result.image} 
                      alt={step.title}
                      className="w-full h-32 object-cover"
                    />
                  </div>
                )}

                {/* Actions */}
                {step.status === 'completed' && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPreviewStep(step)}
                      className="gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      Visualiser
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onRegenerateStep(step.id)}
                      className="gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Régénérer
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
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{previewStep?.title}</DialogTitle>
          </DialogHeader>
          
          {previewStep?.result?.image && (
            <div className="rounded-lg overflow-hidden">
              <img 
                src={previewStep.result.image} 
                alt={previewStep.title}
                className="w-full h-auto"
              />
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
