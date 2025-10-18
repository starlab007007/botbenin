import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export type StepStatus = 'completed' | 'current' | 'pending';

export interface Step {
  id: string;
  title: string;
  icon: React.ReactNode;
  status: StepStatus;
}

interface VideoProductionStepperProps {
  steps: Step[];
  currentStep: number;
}

export function VideoProductionStepper({ steps, currentStep }: VideoProductionStepperProps) {
  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex flex-col items-center flex-1">
            {/* Step Circle */}
            <div className="relative flex items-center w-full">
              {/* Line avant (sauf pour le premier) */}
              {index > 0 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 transition-colors",
                    steps[index - 1].status === 'completed'
                      ? "bg-primary"
                      : "bg-border"
                  )}
                />
              )}

              {/* Circle Icon */}
              <div
                className={cn(
                  "flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all",
                  "mx-2 shrink-0",
                  step.status === 'completed' && "bg-primary border-primary text-primary-foreground",
                  step.status === 'current' && "bg-background border-primary text-primary scale-110",
                  step.status === 'pending' && "bg-muted border-muted-foreground/30 text-muted-foreground"
                )}
              >
                {step.status === 'completed' ? (
                  <Check className="w-6 h-6" />
                ) : (
                  <div className="w-6 h-6">{step.icon}</div>
                )}
              </div>

              {/* Line après (sauf pour le dernier) */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 transition-colors",
                    step.status === 'completed'
                      ? "bg-primary"
                      : "bg-border"
                  )}
                />
              )}
            </div>

            {/* Step Label */}
            <div className="mt-3 text-center">
              <p
                className={cn(
                  "text-sm font-medium transition-colors",
                  step.status === 'current' && "text-foreground",
                  step.status === 'completed' && "text-muted-foreground",
                  step.status === 'pending' && "text-muted-foreground/60"
                )}
              >
                {step.title}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
