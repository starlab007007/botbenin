import React from 'react';
import { Card } from '@/components/ui/card';

interface ModuleWorkflowDiagramProps {
  mermaidCode: string;
  stepsExplanation: Array<{
    step: number;
    title: string;
    description: string;
  }>;
}

export const ModuleWorkflowDiagram: React.FC<ModuleWorkflowDiagramProps> = ({ 
  mermaidCode, 
  stepsExplanation 
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold mb-2">🔄 Comment ça Marche ?</h3>
        <p className="text-muted-foreground">
          Visualisez le fonctionnement étape par étape
        </p>
      </div>
      
      <Card className="p-6 bg-gradient-to-br from-muted/30 to-muted/10">
        <div className="bg-background/80 backdrop-blur-sm p-6 rounded-lg border">
          <pre className="text-sm text-foreground whitespace-pre-wrap overflow-x-auto">
            {mermaidCode}
          </pre>
        </div>
      </Card>
      
      <div className="space-y-4">
        <h4 className="font-semibold text-lg">Explication du Workflow</h4>
        <div className="grid gap-4">
          {stepsExplanation.map((step, index) => (
            <div key={index} className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                {step.step}
              </div>
              <div className="flex-1 pt-1">
                <h5 className="font-semibold mb-1">{step.title}</h5>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
