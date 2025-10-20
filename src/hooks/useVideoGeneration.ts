import { useState, useEffect } from 'react';
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
  const [isLoading, setIsLoading] = useState(false);
  const [generatedFrames, setGeneratedFrames] = useState<Record<string, GeneratedFrame[]>>({});

  // Load existing frames from database
  const loadExistingFrames = async (videoId: string) => {
    setIsLoading(true);
    try {
      console.log('📦 Loading frames for video:', videoId);
      
      const { data, error } = await supabase
        .from('video_frames')
        .select('*')
        .eq('video_id', videoId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        console.log('✅ Frames loaded from DB:', data.length, data.map(f => f.frame_type));
        
        const frames = data.map(frame => ({
          imageUrl: frame.image_url,
          videoId: frame.video_id,
          frameType: frame.frame_type,
          prompt: frame.prompt
        }));

        setGeneratedFrames(prev => ({
          ...prev,
          [videoId]: frames
        }));

        return frames;
      } else {
        console.log('ℹ️ No frames found in DB for:', videoId);
      }
    } catch (error) {
      console.error('❌ Error loading frames:', error);
    } finally {
      setIsLoading(false);
    }
    return [];
  };

  // Check if all 4 frames exist for a video
  const hasAllFrames = (videoId: string) => {
    const frames = generatedFrames[videoId] || [];
    return frames.length === 4 && 
      ['hero', 'demo', 'result', 'cta'].every(type => 
        frames.some(f => f.frameType === type)
      );
  };

  const generateFrame = async ({ videoId, prompt, frameType }: GenerateFrameParams): Promise<GeneratedFrame | null> => {
    // Check if frame already exists
    const existing = generatedFrames[videoId]?.find(f => f.frameType === frameType);
    if (existing) {
      toast.info('Frame déjà générée, utilisation de la version existante');
      return existing;
    }
    setIsGenerating(true);
    try {
      // Get current session to pass auth token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Vous devez être connecté pour générer des frames');
        return null;
      }

      const { data, error } = await supabase.functions.invoke('generate-video-frames', {
        body: { videoId, prompt, frameType },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
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
    isLoading,
    generatedFrames,
    generateFrame,
    generateAllFramesForVideo,
    loadExistingFrames,
    hasAllFrames
  };
};
