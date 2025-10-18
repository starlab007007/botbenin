import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getVideoAnimationTemplatesList } from '@/data/videoAnimationTemplates';
import { getAnimationById } from '@/data/textAnimations';
import { VideoAnimationTemplate } from '@/types/animation-templates';
import { Sparkles, Briefcase, BookOpen, Zap, Minimize2, Smile, Waves, TrendingUp } from 'lucide-react';

interface AnimationTemplateSelectorProps {
  selectedTemplateId?: string;
  onSelect: (templateId: string) => void;
}

const templateIcons: Record<string, React.ReactNode> = {
  dynamic: <Zap className="h-5 w-5" />,
  professional: <Briefcase className="h-5 w-5" />,
  storytelling: <BookOpen className="h-5 w-5" />,
  energetic: <Sparkles className="h-5 w-5" />,
  minimal: <Minimize2 className="h-5 w-5" />,
  playful: <Smile className="h-5 w-5" />,
  smooth: <Waves className="h-5 w-5" />,
  impactful: <TrendingUp className="h-5 w-5" />
};

export const AnimationTemplateSelector: React.FC<AnimationTemplateSelectorProps> = ({
  selectedTemplateId,
  onSelect
}) => {
  const templates = getVideoAnimationTemplatesList();

  const getAnimationPreview = (template: VideoAnimationTemplate) => {
    const hookAnim = getAnimationById(template.textAnimations.hook);
    const ctaAnim = getAnimationById(template.textAnimations.cta);
    
    return (
      <div className="flex gap-1 mt-2">
        {hookAnim && (
          <Badge variant="outline" className="text-xs">
            {hookAnim.previewIcon} Hook
          </Badge>
        )}
        {ctaAnim && (
          <Badge variant="outline" className="text-xs">
            {ctaAnim.previewIcon} CTA
          </Badge>
        )}
        {template.globalEffects?.particleEffects && (
          <Badge variant="outline" className="text-xs">
            ✨ Particules
          </Badge>
        )}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {templates.map((template) => (
        <Card
          key={template.id}
          className={`cursor-pointer transition-all hover:shadow-lg ${
            selectedTemplateId === template.id
              ? 'ring-2 ring-primary shadow-lg scale-105'
              : 'hover:scale-102'
          }`}
          onClick={() => onSelect(template.id)}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                {templateIcons[template.id]}
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg">{template.name}</CardTitle>
              </div>
            </div>
            <CardDescription className="text-sm">
              {template.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            {getAnimationPreview(template)}
            
            <div className="mt-3 space-y-1">
              <div className="text-xs text-muted-foreground">
                Transitions: {template.transitions.join(', ')}
              </div>
              {template.globalEffects?.colorGrading && (
                <div className="text-xs text-muted-foreground">
                  Style: {template.globalEffects.colorGrading}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
