import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, Edit, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { FrameType } from '@/hooks/usePromotionalTextGeneration';

interface PromotionalTextDisplayProps {
  frameType: FrameType;
  promotionalText: string | null;
  imageUrl: string;
  onRegenerate?: () => void;
  onEdit?: (newText: string) => void;
}

export function PromotionalTextDisplay({
  frameType,
  promotionalText,
  imageUrl,
  onRegenerate,
  onEdit
}: PromotionalTextDisplayProps) {
  const { toast } = useToast();

  const handleCopy = () => {
    if (promotionalText) {
      navigator.clipboard.writeText(promotionalText);
      toast({
        title: 'Copié',
        description: 'Texte copié dans le presse-papiers'
      });
    }
  };

  const frameLabels: Record<FrameType, string> = {
    hero: 'ACCROCHE',
    demo: 'DÉMO',
    result: 'RÉSULTAT',
    cta: 'APPEL À L\'ACTION'
  };

  return (
    <Card>
      <CardHeader>
        <Badge className="w-fit">{frameLabels[frameType]}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <img 
          src={imageUrl} 
          alt={`Frame ${frameType}`}
          className="rounded-lg w-full h-48 object-cover"
        />
        {promotionalText ? (
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-lg font-semibold leading-relaxed">{promotionalText}</p>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline">
                {promotionalText.split(/\s+/).length} mots
              </Badge>
              <Badge variant="outline">
                {promotionalText.length} caractères
              </Badge>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-muted rounded-lg text-center text-muted-foreground">
            <p>Pas encore de texte promotionnel généré</p>
          </div>
        )}
      </CardContent>
      {promotionalText && (
        <CardFooter className="flex gap-2">
          {onRegenerate && (
            <Button size="sm" onClick={onRegenerate}>
              <Sparkles className="mr-2 h-4 w-4" />
              Régénérer
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={handleCopy}>
            <Copy className="mr-2 h-4 w-4" />
            Copier
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
