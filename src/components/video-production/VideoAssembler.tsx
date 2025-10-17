import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Play, Download, Film, History } from 'lucide-react';
import { VideoProduction } from '@/types/video-production';
import { getTemplatesList } from '@/data/videoTemplates';
import { musicLibrary } from '@/data/musicLibrary';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();
  const [selectedTemplate, setSelectedTemplate] = useState('standard');
  const [selectedMusic, setSelectedMusic] = useState(musicLibrary[0].id);
  const [musicVolume, setMusicVolume] = useState([30]);
  const [isAssembling, setIsAssembling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [generatedVideoData, setGeneratedVideoData] = useState<any>(null);

  const templates = getTemplatesList();

  const steps = [
    { key: 'init', label: 'Initialisation', progress: 10 },
    { key: 'validate', label: 'Validation frames', progress: 25 },
    { key: 'upload', label: 'Upload données', progress: 50 },
    { key: 'save', label: 'Sauvegarde base', progress: 75 },
    { key: 'complete', label: 'Finalisation', progress: 100 },
  ];

  const handleAssemble = async () => {
    setIsAssembling(true);
    setProgress(0);
    setCurrentStep('init');

    try {
      // Étape 1: Validation
      setCurrentStep('validate');
      setProgress(25);
      console.log('🎬 Starting video assembly...');
      
      const frameUrls = Object.values(frames);
      const invalidFrames = frameUrls.filter(url => !url || url === '');
      
      if (invalidFrames.length > 0) {
        toast.error('❌ Certaines frames sont manquantes');
        return;
      }

      // Étape 2: Préparation des données
      setCurrentStep('upload');
      setProgress(50);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Vous devez être connecté');
        return;
      }

      const template = templates.find(t => t.id === selectedTemplate) || templates[0];
      const music = musicLibrary.find(m => m.id === selectedMusic) || musicLibrary[0];

      // Étape 3: Appel de l'edge function
      setCurrentStep('save');
      setProgress(75);

      const { data, error } = await supabase.functions.invoke('assemble-video', {
        body: {
          videoId: video.id,
          videoTitle: video.title,
          frames,
          config: {
            frameDurations: template.frameDurations,
            transitions: template.transitions,
            musicVolume: musicVolume[0] / 100,
          },
          userId: user.id,
          templateId: selectedTemplate,
          musicId: selectedMusic
        }
      });

      if (error) throw error;

      // Étape 4: Finalisation
      setCurrentStep('complete');
      setProgress(100);

      console.log('✅ Video saved successfully:', data);
      setGeneratedVideoData(data);
      
      toast.success('✅ Vidéo créée et sauvegardée dans l\'historique!');

    } catch (error: any) {
      console.error('❌ Video assembly failed:', error);
      toast.error(`Erreur: ${error.message || 'Échec de la création'}`);
    } finally {
      setIsAssembling(false);
    }
  };

  const downloadFrame = (frameUrl: string, frameName: string) => {
    const a = document.createElement('a');
    a.href = frameUrl;
    a.download = `${video.title}_${frameName}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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
      {!generatedVideoData && (
        <Button
          onClick={handleAssemble}
          disabled={isAssembling}
          className="w-full"
          size="lg"
        >
          <Film className="w-4 h-4 mr-2" />
          {isAssembling ? 'Création en cours...' : 'Créer la vidéo'}
        </Button>
      )}

      {/* Progress bar */}
      {isAssembling && (
        <Card className="p-6 space-y-4 bg-muted/50">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm font-medium">
              <span>{steps.find(s => s.key === currentStep)?.label || 'En cours...'}</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {steps.map((step) => (
              <div
                key={step.key}
                className={`flex items-center gap-2 text-sm ${
                  currentStep === step.key
                    ? 'text-primary font-medium'
                    : progress >= step.progress
                    ? 'text-green-600'
                    : 'text-muted-foreground'
                }`}
              >
                <span className="text-lg">
                  {progress >= step.progress ? '✓' : currentStep === step.key ? '⏳' : '○'}
                </span>
                <span>{step.label}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Vidéo générée */}
      {generatedVideoData && (
        <Card className="p-6 space-y-4 border-2 border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-full bg-primary/10">
              <Film className="w-5 h-5 text-primary" />
            </div>
            <h4 className="font-semibold text-lg">Vidéo créée avec succès!</h4>
          </div>

          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-4">
              Votre vidéo a été sauvegardée dans l'historique avec toutes les frames générées.
            </p>
            
            {/* Grille des frames */}
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(generatedVideoData.allFrames || frames).map(([key, url]) => (
                <div key={key} className="relative group">
                  <img 
                    src={url as string} 
                    alt={key}
                    className="w-full rounded-lg shadow-md"
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => downloadFrame(url as string, key)}
                  >
                    <Download className="w-3 h-3" />
                  </Button>
                  <p className="text-xs mt-1 text-center capitalize">{key}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => navigate('/video-library')}
              className="flex-1 gap-2"
            >
              <History className="w-4 h-4" />
              Voir l'historique
            </Button>
            <Button 
              variant="outline" 
              className="flex-1 gap-2"
              onClick={() => {
                setGeneratedVideoData(null);
                setProgress(0);
                setCurrentStep('');
              }}
            >
              <Film className="w-4 h-4" />
              Créer une autre
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">4</p>
              <p className="text-xs text-muted-foreground">Frames</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">PNG</p>
              <p className="text-xs text-muted-foreground">Format</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">9:16</p>
              <p className="text-xs text-muted-foreground">Ratio</p>
            </div>
          </div>
        </Card>
      )}
    </Card>
  );
};
