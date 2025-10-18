import { useState } from 'react';
import { Sparkles, Edit, Play, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AudioPreviewPlayer } from './AudioPreviewPlayer';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { videoAudioService } from '@/services/videoAudioService';

interface VideoScriptGeneratorProps {
  frames: {
    hero: string;
    demo: string;
    result: string;
    cta: string;
  };
  videoId?: string;
  onScriptGenerated?: (data: {
    scriptText: string;
    audioUrl: string;
    audioDuration: number;
    voiceId: string;
  }) => void;
}

type ScriptDuration = 'short' | 'medium' | 'long';

const VOICE_OPTIONS = [
  { id: '9BWtsMINqrJLrRacOk9x', name: 'Aria (Féminine, Douce)' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah (Féminine, Professionnelle)' },
  { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger (Masculine, Autoritaire)' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam (Masculine, Dynamique)' },
];

export function VideoScriptGenerator({ frames, videoId, onScriptGenerated }: VideoScriptGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [scriptText, setScriptText] = useState('');
  const [duration, setDuration] = useState<ScriptDuration>('medium');
  const [voiceId, setVoiceId] = useState(VOICE_OPTIONS[1].id);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const [estimatedDuration, setEstimatedDuration] = useState(0);
  const { toast } = useToast();

  const handleGenerateScript = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-video-description', {
        body: {
          frames: {
            hero: `Frame Hero: Image promotionnelle accrocheuse`,
            demo: `Frame Demo: Démonstration du produit`,
            result: `Frame Result: Résultats obtenus`,
            cta: `Frame CTA: Appel à l'action`
          },
          duration,
          platform: 'tiktok'
        }
      });

      if (error) throw error;

      setScriptText(data.scriptText);
      setWordCount(data.wordCount);
      setEstimatedDuration(data.estimatedDuration);

      toast({
        title: "Script généré !",
        description: `${data.wordCount} mots • ~${data.estimatedDuration}s`,
      });

    } catch (error) {
      console.error('Erreur génération script:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de générer le script",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateAudio = async () => {
    if (!scriptText.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez d'abord générer ou saisir un script",
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingAudio(true);
    try {
      // Générer l'audio
      const result = await videoAudioService.generateAudio({
        scriptText,
        voiceId,
        speed: 1.0,
      });

      setAudioUrl(result.audioUrl);
      setAudioDuration(result.duration);

      // Si on a un videoId, uploader et sauvegarder
      if (videoId && onScriptGenerated) {
        const publicUrl = await videoAudioService.uploadAudioToStorage(result.audioBlob, videoId);
        
        await videoAudioService.saveVideoDescription({
          videoId,
          scriptText,
          scriptLength: duration,
          audioUrl: publicUrl,
          audioDuration: result.duration,
          voiceId
        });

        onScriptGenerated({
          scriptText,
          audioUrl: publicUrl,
          audioDuration: result.duration,
          voiceId
        });
      }

      toast({
        title: "Audio généré !",
        description: `Durée: ${result.duration.toFixed(1)}s`,
      });

    } catch (error) {
      console.error('Erreur génération audio:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de générer l'audio",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const handleDownloadScript = () => {
    const blob = new Blob([scriptText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `script-video-${duration}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Script Promotionnel
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Générez un script captivant avec l'IA ou écrivez le vôtre
          </p>
        </div>

        {/* Duration Selection */}
        <div className="space-y-3">
          <Label>Durée du script</Label>
          <RadioGroup value={duration} onValueChange={(v) => setDuration(v as ScriptDuration)}>
            <div className="flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="short" id="short" />
                <Label htmlFor="short">Court (15s)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="medium" id="medium" />
                <Label htmlFor="medium">Moyen (30s)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="long" id="long" />
                <Label htmlFor="long">Long (45s)</Label>
              </div>
            </div>
          </RadioGroup>
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerateScript}
          disabled={isGenerating}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Génération en cours...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Générer avec l'IA
            </>
          )}
        </Button>

        {/* Script Editor */}
        {scriptText && (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Script</Label>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{wordCount} mots</span>
                  <span>•</span>
                  <span>~{estimatedDuration}s</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={handleDownloadScript}
                  >
                    <Download className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <Textarea
                value={scriptText}
                onChange={(e) => {
                  setScriptText(e.target.value);
                  const words = e.target.value.split(/\s+/).length;
                  setWordCount(words);
                  setEstimatedDuration(Math.round((words / 2.5) * 10) / 10);
                }}
                rows={8}
                placeholder="Votre script apparaîtra ici..."
                className="resize-none"
              />
            </div>

            {/* Voice Selection */}
            <div className="space-y-2">
              <Label>Voix</Label>
              <Select value={voiceId} onValueChange={setVoiceId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VOICE_OPTIONS.map((voice) => (
                    <SelectItem key={voice.id} value={voice.id}>
                      {voice.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Generate Audio Button */}
            <Button
              onClick={handleGenerateAudio}
              disabled={isGeneratingAudio || !scriptText.trim()}
              variant="secondary"
              className="w-full"
            >
              {isGeneratingAudio ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Génération audio...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Générer l'audio
                </>
              )}
            </Button>

            {/* Audio Preview */}
            {audioUrl && (
              <div className="space-y-2">
                <Label>Prévisualisation Audio</Label>
                <AudioPreviewPlayer audioUrl={audioUrl} />
                <p className="text-xs text-muted-foreground text-center">
                  Durée réelle: {audioDuration.toFixed(1)}s
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
