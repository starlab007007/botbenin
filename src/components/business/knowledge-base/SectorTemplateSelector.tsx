import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  UtensilsCrossed, 
  Hotel, 
  Building2, 
  ShoppingCart, 
  GraduationCap, 
  School, 
  Hospital 
} from 'lucide-react';
import { KnowledgeBaseTemplate } from '@/types/knowledge-base';

interface SectorTemplateSelectorProps {
  templates: KnowledgeBaseTemplate[];
  onSelectTemplate: (template: KnowledgeBaseTemplate) => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
  UtensilsCrossed,
  Hotel,
  Building2,
  ShoppingCart,
  GraduationCap,
  School,
  Hospital
};

export const SectorTemplateSelector: React.FC<SectorTemplateSelectorProps> = ({ 
  templates, 
  onSelectTemplate 
}) => {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="text-center space-y-2 px-3 sm:px-0">
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold">Choisissez votre secteur d'activité</h2>
        <p className="text-sm sm:text-base text-muted-foreground">
          Sélectionnez un template adapté à votre business pour créer votre base de connaissances
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {templates.map((template) => {
          const Icon = ICON_MAP[template.icon] || UtensilsCrossed;
          
          return (
            <Card 
              key={template.id}
              className="group hover:shadow-xl transition-all cursor-pointer border-2 hover:border-primary active:scale-95"
              onClick={() => onSelectTemplate(template)}
            >
              <CardHeader className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className={`w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br ${template.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                  </div>
                  <Badge variant="outline" className="bg-background text-xs">
                    {template.tables.length} tables
                  </Badge>
                </div>
                <CardTitle className="text-base sm:text-lg group-hover:text-primary transition-colors">
                  {template.name}
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm line-clamp-2">
                  {template.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <div className="space-y-2">
                  <div className="text-xs sm:text-sm text-muted-foreground">
                    Inclut :
                  </div>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {template.tables.slice(0, 2).map(table => (
                      <Badge key={table.id} variant="secondary" className="text-xs">
                        {table.name}
                      </Badge>
                    ))}
                    {template.tables.length > 2 && (
                      <Badge variant="secondary" className="text-xs">
                        +{template.tables.length - 2} autres
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
