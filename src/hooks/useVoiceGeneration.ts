import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface VoiceGenerationOptions {
  text: string;
  voiceId: string;
  videoId: string;
  frameType?: 'hero' | 'demo' | 'result' | 'cta' | 'summary';
  speed?: number;
}

export interface VoiceGenerationResult {
  audioUrl: string;
  audioDuration: number;
  audioSize: number;
  voiceUsed: string;
}

export const useVoiceGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const generateVoice = async (options: VoiceGenerationOptions): Promise<VoiceGenerationResult | null> => {
    setIsGenerating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-promotional-voice', {
        body: {
          text: options.text,
          voiceId: options.voiceId,
          videoId: options.videoId,
          frameType: options.frameType,
          speed: options.speed || 1.0,
        }
      });

      if (error) {
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Erreur de génération vocale');
      }

      toast({
        title: '🎤 Voix générée !',
        description: `Audio créé avec succès (${Math.round(data.audioDuration)}s)`,
      });

      return {
        audioUrl: data.audioUrl,
        audioDuration: data.audioDuration,
        audioSize: data.audioSize,
        voiceUsed: data.voiceUsed,
      };

    } catch (error) {
      console.error('Voice generation error:', error);
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Erreur de génération vocale',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const generateMultipleVoices = async (
    texts: Array<{ text: string; frameType: 'hero' | 'demo' | 'result' | 'cta' }>,
    voiceId: string,
    videoId: string
  ): Promise<boolean> => {
    setIsGenerating(true);
    
    try {
      const results = await Promise.all(
        texts.map(({ text, frameType }) => 
          generateVoice({
            text,
            voiceId,
            videoId,
            frameType,
          })
        )
      );

      const allSuccessful = results.every(result => result !== null);

      if (allSuccessful) {
        toast({
          title: '✅ Toutes les voix générées !',
          description: `${texts.length} pistes audio créées avec succès`,
        });
      } else {
        toast({
          title: '⚠️ Génération partielle',
          description: 'Certaines pistes audio n\'ont pas pu être créées',
          variant: 'destructive',
        });
      }

      return allSuccessful;

    } catch (error) {
      console.error('Multiple voice generation error:', error);
      toast({
        title: 'Erreur',
        description: 'Erreur lors de la génération multiple',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generateVoice,
    generateMultipleVoices,
    isGenerating,
  };
};
