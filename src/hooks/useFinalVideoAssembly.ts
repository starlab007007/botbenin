import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AssemblyStatus {
  step: string;
  progress: number;
  message: string;
}

export const useFinalVideoAssembly = () => {
  const [isAssembling, setIsAssembling] = useState(false);
  const [assemblyStatus, setAssemblyStatus] = useState<AssemblyStatus | null>(null);
  const { toast } = useToast();

  const assembleVideo = async (
    videoId: string,
    videoUrl: string,
    audioTracks: Array<{ url: string; frameType: string; duration: number }>
  ): Promise<{ finalVideoUrl: string; finalVideoId: string } | null> => {
    setIsAssembling(true);
    setAssemblyStatus({ step: 'merging-audio', progress: 20, message: 'Fusion des pistes audio...' });

    try {
      // Étape 1: Fusionner les pistes audio
      const { data: mergeData, error: mergeError } = await supabase.functions.invoke('merge-audio-tracks', {
        body: {
          videoId,
          audioTracks,
        }
      });

      if (mergeError) {
        throw mergeError;
      }

      if (!mergeData?.success) {
        throw new Error(mergeData?.error || 'Erreur de fusion audio');
      }

      console.log('✅ Audio merged:', mergeData);
      setAssemblyStatus({ step: 'assembling-video', progress: 60, message: 'Assemblage vidéo + audio...' });

      toast({
        title: '🎵 Audio fusionné !',
        description: mergeData.message || 'Pistes audio fusionnées avec succès',
      });

      // Étape 2: Assembler vidéo + audio
      const { data: assembleData, error: assembleError } = await supabase.functions.invoke('assemble-final-video', {
        body: {
          videoId,
          videoUrl,
          mergedAudioUrl: mergeData.mergedAudioUrl,
        }
      });

      if (assembleError) {
        throw assembleError;
      }

      if (!assembleData?.success) {
        throw new Error(assembleData?.error || 'Erreur d\'assemblage vidéo');
      }

      console.log('✅ Video assembled:', assembleData);
      setAssemblyStatus({ step: 'complete', progress: 100, message: 'Vidéo finale prête !' });

      toast({
        title: '🎬 Vidéo assemblée !',
        description: 'Votre vidéo finale est prête au téléchargement',
      });

      return {
        finalVideoUrl: assembleData.finalVideoUrl,
        finalVideoId: assembleData.finalVideoId,
      };

    } catch (error) {
      console.error('Final video assembly error:', error);
      setAssemblyStatus({ step: 'error', progress: 0, message: 'Erreur lors de l\'assemblage' });
      
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Erreur d\'assemblage vidéo',
        variant: 'destructive',
      });
      
      return null;
    } finally {
      setIsAssembling(false);
    }
  };

  return {
    assembleVideo,
    isAssembling,
    assemblyStatus,
  };
};
