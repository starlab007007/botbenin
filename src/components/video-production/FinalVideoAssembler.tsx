import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Download, Film, Loader2 } from 'lucide-react';
import { useFinalVideoAssembly } from '@/hooks/useFinalVideoAssembly';

interface FinalVideoAssemblerProps {
  videoId: string;
  videoUrl: string;
  audioTracks: Array<{
    url: string;
    frameType: string;
    duration: number;
  }>;
  frames: {
    hero?: string;
    demo?: string;
    result?: string;
    cta?: string;
  };
}

export const FinalVideoAssembler = ({ 
  videoId, 
  videoUrl, 
  audioTracks,
  frames 
}: FinalVideoAssemblerProps) => {
  const [finalVideo, setFinalVideo] = useState<{ url: string; id: string } | null>(null);
  const { assembleVideo, isAssembling, assemblyStatus } = useFinalVideoAssembly();

  // Vérifier que tout est prêt
  const hasAllFrames = frames.hero && frames.demo && frames.result && frames.cta;
  const hasAllAudio = audioTracks.length === 4;
  const hasVideo = !!videoUrl;
  const canAssemble = hasAllFrames && hasAllAudio && hasVideo && !isAssembling;

  const handleAssemble = async () => {
    const result = await assembleVideo(videoId, videoUrl, audioTracks);
    if (result) {
      setFinalVideo({ url: result.finalVideoUrl, id: result.finalVideoId });
    }
  };

  const handleDownload = () => {
    if (finalVideo) {
      const link = document.createElement('a');
      link.href = finalVideo.url;
      link.download = `video-finale-${videoId}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Film className="h-5 w-5" />
          Assemblage Vidéo Finale
        </CardTitle>
        <CardDescription>
          Fusionner les pistes audio et créer la vidéo finale de 10 secondes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Checklist des prérequis */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Prérequis :</h3>
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${hasAllFrames ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span>4 frames générées</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${hasAllAudio ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span>4 pistes audio générées</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${hasVideo ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span>Vidéo de 10s générée</span>
            </div>
          </div>
        </div>

        {/* Bouton d'assemblage */}
        {!finalVideo && (
          <Button
            onClick={handleAssemble}
            disabled={!canAssemble}
            className="w-full"
            size="lg"
          >
            {isAssembling ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Assemblage en cours...
              </>
            ) : (
              <>
                <Film className="mr-2 h-4 w-4" />
                Assembler la vidéo finale
              </>
            )}
          </Button>
        )}

        {/* Barre de progression */}
        {isAssembling && assemblyStatus && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{assemblyStatus.message}</span>
              <span className="font-medium">{assemblyStatus.progress}%</span>
            </div>
            <Progress value={assemblyStatus.progress} />
          </div>
        )}

        {/* Vidéo finale */}
        {finalVideo && (
          <div className="space-y-4">
            <div className="rounded-lg overflow-hidden bg-black aspect-[9/16]">
              <video
                src={finalVideo.url}
                controls
                className="w-full h-full object-contain"
              >
                Votre navigateur ne supporte pas la lecture vidéo.
              </video>
            </div>

            <Button
              onClick={handleDownload}
              className="w-full"
              size="lg"
            >
              <Download className="mr-2 h-4 w-4" />
              Télécharger la vidéo finale
            </Button>

            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                ✅ Votre vidéo finale de 10 secondes est prête !
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Vidéo + audio fusionnés et optimisés pour les réseaux sociaux.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
