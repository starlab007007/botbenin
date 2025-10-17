import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GenerateFrameParams {
  videoId: string;
  prompt: string;
  frameType: 'hero' | 'demo' | 'result' | 'cta';
}

interface GeneratedFrame {
  imageUrl: string;
  videoId: string;
  frameType: string;
  prompt: string;
}

export const useVideoGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedFrames, setGeneratedFrames] = useState<Record<string, GeneratedFrame[]>>({});

  const generateFrame = async ({ videoId, prompt, frameType }: GenerateFrameParams): Promise<GeneratedFrame | null> => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-video-frames', {
        body: { videoId, prompt, frameType }
      });

      if (error) {
        if (error.message?.includes('429') || error.message?.includes('Rate limit')) {
          toast.error('Limite de taux atteinte. Veuillez réessayer dans quelques instants.');
        } else if (error.message?.includes('402') || error.message?.includes('credits')) {
          toast.error('Crédits insuffisants. Veuillez ajouter des crédits à votre espace de travail.');
        } else {
          toast.error('Erreur lors de la génération: ' + error.message);
        }
        return null;
      }

      if (!data?.imageUrl) {
        toast.error('Aucune image générée');
        return null;
      }

      const frame: GeneratedFrame = {
        imageUrl: data.imageUrl,
        videoId: data.videoId,
        frameType: data.frameType,
        prompt: data.prompt
      };

      setGeneratedFrames(prev => ({
        ...prev,
        [videoId]: [...(prev[videoId] || []), frame]
      }));

      toast.success('Frame générée avec succès');
      return frame;

    } catch (error) {
      console.error('Error generating frame:', error);
      toast.error('Erreur lors de la génération de la frame');
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const generateAllFramesForVideo = async (
    videoId: string,
    prompts: { frameType: 'hero' | 'demo' | 'result' | 'cta'; prompt: string }[]
  ) => {
    const frames: GeneratedFrame[] = [];
    
    for (const { frameType, prompt } of prompts) {
      const frame = await generateFrame({ videoId, prompt, frameType });
      if (frame) {
        frames.push(frame);
      }
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    return frames;
  };

  return {
    isGenerating,
    generatedFrames,
    generateFrame,
    generateAllFramesForVideo
  };
};
