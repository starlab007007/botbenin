import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Volume2, VolumeX } from 'lucide-react';

export const VOICE_OPTIONS = [
  {
    id: 'EXAVITQu4vr4xnSDxMaL',
    name: 'Bella',
    description: 'Féminine, Douce et Engageante',
    gender: 'female',
    accent: 'american',
    age: 'young'
  },
  {
    id: '9BWtsMINqrJLrRacOk9x',
    name: 'Aria',
    description: 'Expressive et Narrative',
    gender: 'female',
    accent: 'american',
    age: 'middle-aged'
  },
  {
    id: 'pNInz6obpgDQGcFmaJgB',
    name: 'Adam',
    description: 'Masculine, Profonde et Confiante',
    gender: 'male',
    accent: 'american',
    age: 'middle-aged'
  },
  {
    id: 'yoZ06aMxZJJ28mfd3POQ',
    name: 'Sam',
    description: 'Jeune et Dynamique',
    gender: 'male',
    accent: 'american',
    age: 'young'
  },
  {
    id: 'ODq5zmih8GrVes37Dizd',
    name: 'Patrick',
    description: 'Mature et Autoritaire',
    gender: 'male',
    accent: 'american',
    age: 'old'
  }
];

interface VoiceSelectorProps {
  selectedVoiceId: string;
  onVoiceSelect: (voiceId: string) => void;
}

export const VoiceSelector = ({ selectedVoiceId, onVoiceSelect }: VoiceSelectorProps) => {
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);

  const playVoicePreview = (voiceId: string) => {
    // Pour le moment, juste un indicateur visuel
    // Plus tard, on pourra ajouter de vrais samples audio
    setPlayingVoice(voiceId);
    setTimeout(() => setPlayingVoice(null), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {VOICE_OPTIONS.map((voice) => (
          <Card
            key={voice.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedVoiceId === voice.id
                ? 'border-primary ring-2 ring-primary ring-offset-2'
                : 'border-border'
            }`}
            onClick={() => onVoiceSelect(voice.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{voice.name}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    {voice.description}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    playVoicePreview(voice.id);
                  }}
                  className="h-8 w-8 p-0"
                >
                  {playingVoice === voice.id ? (
                    <Volume2 className="h-4 w-4 text-primary animate-pulse" />
                  ) : (
                    <VolumeX className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex gap-1 flex-wrap">
                <Badge variant="secondary" className="text-xs">
                  {voice.gender === 'male' ? '👨' : '👩'} {voice.gender}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {voice.age}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
