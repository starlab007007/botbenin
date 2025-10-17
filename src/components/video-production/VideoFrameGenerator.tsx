import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Download, Eye } from 'lucide-react';
import { VideoProduction } from '@/types/video-production';
import { useVideoGeneration } from '@/hooks/useVideoGeneration';
import { Progress } from '@/components/ui/progress';

interface VideoFrameGeneratorProps {
  video: VideoProduction;
}

export const VideoFrameGenerator: React.FC<VideoFrameGeneratorProps> = ({ video }) => {
  const { isGenerating, generatedFrames, generateAllFramesForVideo } = useVideoGeneration();
  const [generationProgress, setGenerationProgress] = useState(0);

  const frames = generatedFrames[video.id] || [];

  const buildPrompts = () => {
    const baseStyle = `Modern mobile-first design, vertical 9:16 format 1080x1920, 
vibrant colors with Bot.BJ branding (green #10B981, blue #3B82F6, orange #F59E0B), 
clean UI, professional quality, high resolution.

CONTEXTE AFRICAIN/BÉNINOIS OBLIGATOIRE:
- Personnages: Africains diversifiés, entrepreneurs béninois
- Décor: Environnement urbain béninois (Cotonou, Porto-Novo, marchés animés)
- Commerce: Maquis, boutiques, restaurants locaux
- Couleurs: Vives et chaleureuses, reflets de l'Afrique
- Textes: UNIQUEMENT en français, devise en CFA
- Éviter: Contextes européens/américains, personnes non-africaines
- Style: Moderne mais authentique, professionnel mais chaleureux
- Éléments: Smartphones, commerce moderne africain, entrepreneurs locaux`;
    
    return [
      {
        frameType: 'hero' as const,
        prompt: `Hero frame for "${video.title}": ${video.hook}. ${baseStyle}. Bold text overlay, eye-catching visual.`
      },
      {
        frameType: 'demo' as const,
        prompt: `Demo screenshot for "${video.title}": Show ${video.content[0]}. ${baseStyle}. UI mockup, interface elements visible.`
      },
      {
        frameType: 'result' as const,
        prompt: `Result visualization for "${video.title}": ${video.content[video.content.length - 1]}. ${baseStyle}. Success indicators, metrics, positive outcome.`
      },
      {
        frameType: 'cta' as const,
        prompt: `Call-to-action frame for "${video.title}": ${video.cta}. ${baseStyle}. Clear button, Logo Bot.BJ visible, compelling visual.`
      }
    ];
  };

  const handleGenerateAll = async () => {
    setGenerationProgress(0);
    const prompts = buildPrompts();
    
    for (let i = 0; i < prompts.length; i++) {
      await generateAllFramesForVideo(video.id, [prompts[i]]);
      setGenerationProgress(((i + 1) / prompts.length) * 100);
    }
  };

  const downloadFrame = (imageUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Génération IA - {video.title}
            </CardTitle>
            <CardDescription>
              Génération automatique des frames avec l'IA
            </CardDescription>
          </div>
          <Button 
            onClick={handleGenerateAll}
            disabled={isGenerating}
            className="gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Génération...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Générer toutes les frames
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {isGenerating && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Progression</span>
              <span className="font-semibold">{Math.round(generationProgress)}%</span>
            </div>
            <Progress value={generationProgress} />
          </div>
        )}

        {/* Generated Frames */}
        {frames.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-semibold">Frames générées ({frames.length})</h4>
            <div className="grid grid-cols-2 gap-4">
              {frames.map((frame, index) => (
                <div key={index} className="space-y-2">
                  <div className="relative group">
                    <img 
                      src={frame.imageUrl}
                      alt={`${frame.frameType} frame`}
                      className="w-full rounded-lg border shadow-sm"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => window.open(frame.imageUrl, '_blank')}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => downloadFrame(frame.imageUrl, `${video.id}-${frame.frameType}.png`)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <Badge variant="secondary" className="capitalize">
                    {frame.frameType}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Video Info */}
        <div className="p-4 bg-muted rounded-lg space-y-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Hook</p>
            <p className="font-semibold">{video.hook}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Contenu</p>
            <ul className="text-sm space-y-1">
              {video.content.map((item, i) => (
                <li key={i}>• {item}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">CTA</p>
            <p className="font-semibold text-primary">{video.cta}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
