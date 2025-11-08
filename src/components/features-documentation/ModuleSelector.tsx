import React from 'react';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { allModules } from '@/data/modules';

interface ModuleSelectorProps {
  selectedModules: string[];
  onModuleToggle: (moduleId: string) => void;
}

export const ModuleSelector: React.FC<ModuleSelectorProps> = ({
  selectedModules,
  onModuleToggle,
}) => {
  const categories = {
    IA: allModules.filter(m => m.category === 'IA'),
    Communication: allModules.filter(m => m.category === 'Communication'),
    Support: allModules.filter(m => m.category === 'Support'),
    Core: allModules.filter(m => m.category === 'Core'),
  };

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Sélectionner les modules à afficher</h3>
        <div className="flex gap-4 mb-4">
          <button
            onClick={() => allModules.forEach(m => onModuleToggle(m.id))}
            className="text-sm text-primary hover:underline"
          >
            Tout sélectionner
          </button>
          <button
            onClick={() => selectedModules.forEach(id => onModuleToggle(id))}
            className="text-sm text-muted-foreground hover:underline"
          >
            Tout désélectionner
          </button>
        </div>
      </div>

      {Object.entries(categories).map(([category, modules]) => (
        <div key={category} className="space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground uppercase">{category}</h4>
          <div className="space-y-2">
            {modules.map(module => (
              <div key={module.id} className="flex items-center gap-3">
                <Checkbox
                  id={module.id}
                  checked={selectedModules.includes(module.id)}
                  onCheckedChange={() => onModuleToggle(module.id)}
                />
                <label
                  htmlFor={module.id}
                  className="text-sm cursor-pointer flex items-center gap-2"
                >
                  <span>{module.icon}</span>
                  <span>{module.title}</span>
                  {module.badge && (
                    <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                      {module.badge}
                    </span>
                  )}
                </label>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="pt-4 border-t">
        <p className="text-sm text-muted-foreground">
          {selectedModules.length} module(s) sélectionné(s) sur {allModules.length}
        </p>
      </div>
    </Card>
  );
};
