import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CompleteModuleData } from '@/types/module';

interface ModulePresentationProps {
  module: CompleteModuleData;
}

export const ModulePresentation: React.FC<ModulePresentationProps> = ({ module }) => {
  const getCategoryColor = (category: string) => {
    const colors = {
      'IA': 'bg-gradient-to-r from-purple-500 to-purple-600',
      'Communication': 'bg-gradient-to-r from-green-500 to-green-600',
      'Support': 'bg-gradient-to-r from-blue-500 to-blue-600',
      'Core': 'bg-gradient-to-r from-orange-500 to-orange-600'
    };
    return colors[category as keyof typeof colors] || colors.Core;
  };

  return (
    <Card className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-2xl ${getCategoryColor(module.category)} flex items-center justify-center text-4xl`}>
            {module.icon}
          </div>
          <div>
            <h2 className="text-3xl font-bold">{module.title}</h2>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary">{module.category}</Badge>
              {module.badge && (
                <Badge className={getCategoryColor(module.category) + ' text-white'}>
                  {module.badge}
                </Badge>
              )}
              <Badge variant="outline">{module.metadata.difficulty}</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Short Description */}
      <p className="text-xl text-muted-foreground leading-relaxed">
        {module.presentation.shortDescription}
      </p>

      {/* Full Description */}
      <div className="space-y-4 pt-4 border-t">
        {module.presentation.fullDescription.map((paragraph, index) => (
          <p key={index} className="text-foreground leading-relaxed">
            {paragraph}
          </p>
        ))}
      </div>

      {/* Key Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
        <div className="p-4 rounded-lg bg-muted/50">
          <div className="text-sm text-muted-foreground mb-1">Configuration</div>
          <div className="font-semibold">{module.metadata.estimatedSetupTime}</div>
        </div>
        <div className="p-4 rounded-lg bg-muted/50">
          <div className="text-sm text-muted-foreground mb-1">Pack Minimum</div>
          <div className="font-semibold">{module.metadata.minimumPlan}</div>
        </div>
        <div className="p-4 rounded-lg bg-muted/50">
          <div className="text-sm text-muted-foreground mb-1">Difficulté</div>
          <div className="font-semibold capitalize">{module.metadata.difficulty}</div>
        </div>
      </div>

      {/* Integrations */}
      {module.metadata.integrations.length > 0 && (
        <div className="pt-4">
          <h4 className="text-sm font-semibold mb-3">Intégrations disponibles</h4>
          <div className="flex flex-wrap gap-2">
            {module.metadata.integrations.map((integration, index) => (
              <Badge key={index} variant="outline">{integration}</Badge>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};
