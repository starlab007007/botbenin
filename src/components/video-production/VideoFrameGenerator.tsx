import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, Sparkles, Eye, Loader2, Film, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { VideoProduction } from '@/types/video-production';
import { useVideoGeneration } from '@/hooks/useVideoGeneration';
import { toast } from 'sonner';

interface VideoFrameGeneratorProps {
  video: VideoProduction;
  onFramesReady?: (frames: any[]) => void;
}

export const VideoFrameGenerator: React.FC<VideoFrameGeneratorProps> = ({ video, onFramesReady }) => {
  const { 
    isGenerating, 
    isLoading,
    generatedFrames, 
    generateAllFramesForVideo,
    loadExistingFrames,
    hasAllFrames
  } = useVideoGeneration();
  const [generationProgress, setGenerationProgress] = useState(0);

  const frames = generatedFrames[video.id] || [];

  // Load existing frames on mount
  useEffect(() => {
    loadExistingFrames(video.id);
  }, [video.id]);

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
    
    // Generate only missing frames
    const missingFrameTypes = ['hero', 'demo', 'result', 'cta'].filter(
      type => !frames.some(f => f.frameType === type)
    );

    if (missingFrameTypes.length === 0) {
      toast.info('Toutes les frames sont déjà générées!');
      return;
    }

    const missingPrompts = prompts.filter(p => 
      missingFrameTypes.includes(p.frameType)
    );
    
    for (let i = 0; i < missingPrompts.length; i++) {
      await generateAllFramesForVideo(video.id, [missingPrompts[i]]);
      setGenerationProgress(((i + 1) / missingPrompts.length) * 100);
    }

    toast.success('✅ Toutes les frames sont générées!');
  };

  const handleContinueToVideo = () => {
    console.log('🎬 Continuer vers création vidéo', { frames, videoId: video.id });
    if (onFramesReady) {
      onFramesReady(frames);
    } else {
      console.error('❌ onFramesReady callback not provided');
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
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Génération IA - {video.title}
        </CardTitle>
        <div className="flex gap-2">
          <Button 
            onClick={handleGenerateAll}
            disabled={isGenerating || isLoading}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            {isGenerating ? 'Génération...' : 
             hasAllFrames(video.id) ? '♻️ Regénérer' : 'Générer toutes les frames'}
          </Button>

          {hasAllFrames(video.id) && (
            <Button 
              onClick={handleContinueToVideo}
              variant="default"
              className="gap-2 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
            >
              <Film className="h-4 w-4" />
              Continuer → Créer la vidéo
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {frames.length > 0 && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              {hasAllFrames(video.id) 
                ? '✅ 4/4 frames générées - Prêt pour la vidéo!'
                : `⏳ ${frames.length}/4 frames générées`}
            </AlertDescription>
          </Alert>
        )}

        {isGenerating && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Génération en cours...</span>
              <span>{Math.round(generationProgress)}%</span>
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