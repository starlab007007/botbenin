import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { ModuleStep } from '@/types/module';

interface ModuleStepByStepProps {
  prerequisites: string[];
  estimatedTime: string;
  steps: ModuleStep[];
  finalResult: {
    description: string;
    metrics?: string[];
  };
}

export const ModuleStepByStep: React.FC<ModuleStepByStepProps> = ({ 
  prerequisites, 
  estimatedTime, 
  steps,
  finalResult
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold mb-2">📝 Guide d'Utilisation Pas-à-Pas</h3>
        <p className="text-muted-foreground">
          Instructions détaillées pour une mise en place réussie
        </p>
      </div>
      
      {/* Prerequisites */}
      <Card className="p-6 border-l-4 border-l-blue-500">
        <h4 className="font-semibold mb-3 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-blue-500" />
          Prérequis
        </h4>
        <ul className="space-y-2">
          {prerequisites.map((prereq, index) => (
            <li key={index} className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-500 mt-1 flex-shrink-0" />
              <span className="text-sm">{prereq}</span>
            </li>
          ))}
        </ul>
      </Card>
      
      {/* Time Estimate */}
      <div className="flex items-center gap-2 text-muted-foreground">
        <Clock className="w-5 h-5" />
        <span className="font-medium">Temps estimé : {estimatedTime}</span>
      </div>
      
      {/* Steps */}
      <div className="space-y-6">
        {steps.map((step, index) => (
          <Card key={index} className="p-6 relative">
            <div className="absolute -left-3 top-6 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
              {step.number}
            </div>
            
            <div className="pl-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <h4 className="text-lg font-semibold">{step.title}</h4>
                <Badge variant="secondary" className="flex-shrink-0">
                  <Clock className="w-3 h-3 mr-1" />
                  {step.duration}
                </Badge>
              </div>
              
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">
                    Actions à réaliser :
                  </div>
                  <ol className="space-y-2">
                    {step.actions.map((action, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <span className="text-primary font-medium">{idx + 1}.</span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ol>
                </div>
                
                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
                  <div className="text-sm font-medium text-green-700 dark:text-green-400 mb-1">
                    ✅ Résultat attendu
                  </div>
                  <div className="text-sm text-green-900 dark:text-green-300">
                    {step.expectedResult}
                  </div>
                </div>
                
                {step.commonErrors && step.commonErrors.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">
                      ⚠️ Erreurs courantes :
                    </div>
                    {step.commonErrors.map((error, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900">
                        <div className="text-sm font-medium text-orange-700 dark:text-orange-400 mb-1">
                          {error.error}
                        </div>
                        <div className="text-sm text-orange-900 dark:text-orange-300">
                          💡 Solution : {error.solution}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
      
      {/* Final Result */}
      <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <div className="space-y-4">
          <h4 className="text-xl font-bold flex items-center gap-2">
            🎉 Résultat Final
          </h4>
          <p className="text-foreground leading-relaxed">
            {finalResult.description}
          </p>
          {finalResult.metrics && finalResult.metrics.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {finalResult.metrics.map((metric, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="font-medium">{metric}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
