import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Play, Download, Share2, Film } from 'lucide-react';
import { useVideoAssembly } from '@/hooks/useVideoAssembly';
import { VideoProduction } from '@/types/video-production';
import { getTemplatesList } from '@/data/videoTemplates';
import { musicLibrary } from '@/data/musicLibrary';
import { africanContext } from '@/data/africanContextData';

interface VideoAssemblerProps {
  video: VideoProduction;
  frames: {
    hero: string;
    demo: string;
    result: string;
    cta: string;
  };
}

export const VideoAssembler = ({ video, frames }: VideoAssemblerProps) => {
  const { isAssembling, assemblyStatus, assembledVideos, assembleVideo, downloadVideo } = useVideoAssembly();
  const [selectedTemplate, setSelectedTemplate] = useState('standard');
  const [selectedMusic, setSelectedMusic] = useState(musicLibrary[0].id);
  const [musicVolume, setMusicVolume] = useState([30]);

  const templates = getTemplatesList();
  const assembledVideo = assembledVideos[video.id];

  const getStepIcon = (step: string) => {
    if (step === 'completed') return '✓';
    if (step === 'error') return '✗';
    if (assemblyStatus.step === step) return '⏳';
    return '○';
  };

  const steps = [
    { key: 'preparing', label: 'Préparation' },
    { key: 'processing_frames', label: 'Traitement frames' },
    { key: 'adding_transitions', label: 'Transitions' },
    { key: 'adding_overlays', label: 'Textes & logos' },
    { key: 'adding_audio', label: 'Musique' },
    { key: 'uploading', label: 'Finalisation' },
  ];

  const handleAssemble = async () => {
    const template = templates.find(t => t.id === selectedTemplate) || templates[0];
    const music = musicLibrary.find(m => m.id === selectedMusic) || musicLibrary[0];

    await assembleVideo({
      videoId: video.id,
      videoTitle: video.title,
      frames,
      config: {
        frameDurations: template.frameDurations,
        transitions: template.transitions,
        musicId: music.id,
        musicVolume: musicVolume[0] / 100,
        templateId: template.id,
        textOverlays: {
          hook: {
            text: video.hook,
            position: template.textPositions.hook,
            fontSize: 72,
            fontColor: '#FFFFFF',
            fontFamily: 'Poppins-Bold',
            duration: [0, template.frameDurations[0]],
            animation: 'fadeIn'
          },
          content: video.content.map((text, index) => ({
            text,
            position: template.textPositions.content,
            fontSize: 48,
            fontColor: '#FFFFFF',
            fontFamily: 'Poppins',
            duration: [
              template.frameDurations.slice(0, index + 1).reduce((a, b) => a + b, 0),
              template.frameDurations.slice(0, index + 2).reduce((a, b) => a + b, 0)
            ],
            animation: 'slideIn'
          })),
          cta: {
            text: `${video.cta}\n${africanContext.contact.phone}\n${africanContext.contact.website}`,
            position: template.textPositions.cta,
            fontSize: 56,
            fontColor: '#10B981',
            fontFamily: 'Poppins-Bold',
            duration: [7.5, 10],
            animation: 'fadeIn'
          }
        }
      }
    });
  };

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Film className="w-5 h-5 text-primary" />
        <h3 className="text-xl font-semibold">Montage Vidéo</h3>
      </div>

      {/* Prévisualisation des frames */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">Hero</p>
          <img src={frames.hero} alt="Hero frame" className="w-full rounded-lg shadow-md" />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Demo</p>
          <img src={frames.demo} alt="Demo frame" className="w-full rounded-lg shadow-md" />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Result</p>
          <img src={frames.result} alt="Result frame" className="w-full rounded-lg shadow-md" />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">CTA</p>
          <img src={frames.cta} alt="CTA frame" className="w-full rounded-lg shadow-md" />
        </div>
      </div>

      {/* Configuration du montage */}
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Template de montage</label>
          <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {templates.map(template => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name} - {template.description}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Musique de fond</label>
          <Select value={selectedMusic} onValueChange={setSelectedMusic}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {musicLibrary.map(music => (
                <SelectItem key={music.id} value={music.id}>
                  {music.name} ({music.mood}) - {music.bpm} BPM
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Volume musique: {musicVolume[0]}%</label>
          <Slider
            value={musicVolume}
            onValueChange={setMusicVolume}
            min={0}
            max={100}
            step={5}
          />
        </div>
      </div>

      {/* Bouton d'assemblage */}
      {!assembledVideo && (
        <Button
          onClick={handleAssemble}
          disabled={isAssembling}
          className="w-full"
          size="lg"
        >
          <Film className="w-4 h-4 mr-2" />
          {isAssembling ? 'Montage en cours...' : 'Assembler la vidéo'}
        </Button>
      )}

      {/* Progress bar avec étapes détaillées */}
      {isAssembling && (
        <Card className="p-6 space-y-4 bg-muted/50">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm font-medium">
              <span>{assemblyStatus.message}</span>
              <span>{assemblyStatus.progress}%</span>
            </div>
            <Progress value={assemblyStatus.progress} className="h-2" />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {steps.map((step) => (
              <div
                key={step.key}
                className={`flex items-center gap-2 text-sm ${
                  assemblyStatus.step === step.key
                    ? 'text-primary font-medium'
                    : 'text-muted-foreground'
                }`}
              >
                <span className="text-lg">{getStepIcon(step.key)}</span>
                <span>{step.label}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Vidéo assemblée */}
      {assembledVideo && (
        <Card className="p-6 space-y-4 border-2 border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-full bg-primary/10">
              <Film className="w-5 h-5 text-primary" />
            </div>
            <h4 className="font-semibold text-lg">Vidéo générée avec succès!</h4>
          </div>

          <div className="bg-black rounded-lg overflow-hidden shadow-lg">
            <video
              src={assembledVideo.url}
              controls
              className="w-full aspect-[9/16] object-contain"
              poster={assembledVideo.thumbnailUrl}
              preload="metadata"
            >
              Votre navigateur ne supporte pas la lecture vidéo.
            </video>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Button
              variant="outline"
              onClick={() => window.open(assembledVideo.url, '_blank')}
              className="gap-2"
            >
              <Play className="w-4 h-4" />
              Lire
            </Button>
            <Button
              onClick={() => downloadVideo(assembledVideo.url, `${video.title}.mp4`)}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Télécharger
            </Button>
            <Button variant="outline" className="gap-2">
              <Share2 className="w-4 h-4" />
              Partager
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{assembledVideo.duration}s</p>
              <p className="text-xs text-muted-foreground">Durée</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{assembledVideo.format.toUpperCase()}</p>
              <p className="text-xs text-muted-foreground">Format</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{(assembledVideo.size / (1024 * 1024)).toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">MB</p>
            </div>
          </div>
        </Card>
      )}
    </Card>
  );
};
