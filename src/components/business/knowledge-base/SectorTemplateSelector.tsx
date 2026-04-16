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
  Hospital,
  MessageCircle,
  ArrowRight
} from 'lucide-react';
import { KnowledgeBaseTemplate } from '@/types/knowledge-base';
import { useIsMobile } from '@/hooks/use-mobile';

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
  Hospital,
  MessageCircle
};

export const SectorTemplateSelector: React.FC<SectorTemplateSelectorProps> = ({ 
  templates, 
  onSelectTemplate 
}) => {
  const isMobile = useIsMobile();

  return (
    <div className="space-y-6">
      <div className="text-center space-y-3 px-2">
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          Choisissez votre secteur d'activité
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
          Sélectionnez un template adapté à votre business pour créer votre base de connaissances
        </p>
      </div>

      <div className={`grid gap-3 sm:gap-4 lg:gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3'}`}>
        {templates.map((template) => {
          const Icon = ICON_MAP[template.icon] || UtensilsCrossed;
          
          return (
            <Card 
              key={template.id}
              className="group hover:shadow-xl transition-all duration-300 cursor-pointer border-2 hover:border-primary/50 active:scale-[0.98] relative overflow-hidden"
              onClick={() => onSelectTemplate(template)}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardHeader className="p-4 sm:p-5 relative">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br ${template.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg shrink-0`}>
                    <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base sm:text-lg group-hover:text-primary transition-colors truncate">
                        {template.name}
                      </CardTitle>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
                    </div>
                    <CardDescription className="text-xs sm:text-sm line-clamp-2 mt-1">
                      {template.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-4 sm:px-5 pb-4 pt-0 relative">
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1.5">
                    {template.tables.slice(0, isMobile ? 2 : 3).map(table => (
                      <Badge key={table.id} variant="secondary" className="text-[10px] sm:text-xs font-normal">
                        {table.name}
                      </Badge>
                    ))}
                    {template.tables.length > (isMobile ? 2 : 3) && (
                      <Badge variant="outline" className="text-[10px] sm:text-xs font-normal">
                        +{template.tables.length - (isMobile ? 2 : 3)}
                      </Badge>
                    )}
                  </div>
                  <Badge variant="outline" className="text-[10px] sm:text-xs shrink-0 ml-2">
                    {template.tables.length} tables
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
