import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Volume2, Play } from 'lucide-react';
import { FRENCH_VOICES } from '@/data/frenchVoices';
import { cn } from '@/lib/utils';

interface VoiceSelectorProps {
  selectedVoiceId: string;
  onVoiceSelect: (voiceId: string) => void;
}

export const VoiceSelector = ({ selectedVoiceId, onVoiceSelect }: VoiceSelectorProps) => {
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [audioInstances, setAudioInstances] = useState<Map<string, HTMLAudioElement>>(new Map());

  const playVoicePreview = async (voiceId: string, sampleText: string) => {
    // Arrêter tout audio en cours
    audioInstances.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    setPlayingVoice(null);

    // Pour la démo, utiliser la synthèse vocale du navigateur
    const utterance = new SpeechSynthesisUtterance(sampleText);
    utterance.lang = 'fr-FR';
    utterance.rate = 1.0;
    
    setPlayingVoice(voiceId);
    
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    
    utterance.onend = () => {
      setPlayingVoice(null);
    };
  };

  const getMoodIcon = (mood: string) => {
    switch (mood) {
      case 'professional':
        return '💼';
      case 'dynamic':
        return '⚡';
      case 'gentle':
        return '🌸';
      case 'energetic':
        return '🚀';
      default:
        return '🎤';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Choisir une voix française</CardTitle>
        <CardDescription>
          Sélectionnez la voix qui correspond le mieux au ton de votre vidéo
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {FRENCH_VOICES.map((voice) => (
            <Card
              key={voice.id}
              className={cn(
                'cursor-pointer transition-all hover:shadow-md',
                selectedVoiceId === voice.id
                  ? 'border-primary ring-2 ring-primary ring-offset-2'
                  : 'border-border hover:border-primary/50'
              )}
              onClick={() => onVoiceSelect(voice.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{voice.name}</CardTitle>
                      <span className="text-lg">{getMoodIcon(voice.mood)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {voice.description}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      playVoicePreview(voice.id, voice.sampleText);
                    }}
                    className="h-8 w-8 p-0 shrink-0"
                  >
                    {playingVoice === voice.id ? (
                      <Volume2 className="h-4 w-4 text-primary animate-pulse" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex gap-1 flex-wrap">
                  <Badge variant="secondary" className="text-xs">
                    {voice.gender === 'male' ? '👨' : '👩'} {voice.gender === 'male' ? 'Masculin' : 'Féminin'}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {voice.age === 'young' ? 'Jeune' : voice.age === 'adult' ? 'Adulte' : 'Mature'}
                  </Badge>
                  <Badge variant="outline" className="text-xs capitalize">
                    {voice.mood}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
