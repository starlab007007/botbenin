import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AssemblyConfig, AssembledVideo } from '@/types/video-assembly';

interface AssembleVideoParams {
  videoId: string;
  videoTitle: string;
  frames: {
    hero: string;
    demo: string;
    result: string;
    cta: string;
  };
  config: AssemblyConfig;
}

export const useVideoAssembly = () => {
  const [isAssembling, setIsAssembling] = useState(false);
  const [assemblyProgress, setAssemblyProgress] = useState(0);
  const [assembledVideos, setAssembledVideos] = useState<Record<string, AssembledVideo>>({});

  const assembleVideo = async (params: AssembleVideoParams): Promise<AssembledVideo | null> => {
    setIsAssembling(true);
    setAssemblyProgress(0);

    try {
      toast.info('Démarrage du montage vidéo...');
      setAssemblyProgress(10);

      // Appel à l'edge function pour assembler la vidéo
      const { data, error } = await supabase.functions.invoke('assemble-video', {
        body: {
          videoId: params.videoId,
          videoTitle: params.videoTitle,
          frames: params.frames,
          config: params.config
        }
      });

      if (error) {
        console.error('Error assembling video:', error);
        if (error.message?.includes('429') || error.message?.includes('Rate limit')) {
          toast.error('Limite de taux atteinte. Réessayez dans quelques instants.');
        } else if (error.message?.includes('credits')) {
          toast.error('Crédits insuffisants pour le montage vidéo.');
        } else {
          toast.error('Erreur lors du montage: ' + error.message);
        }
        return null;
      }

      setAssemblyProgress(90);

      if (!data?.videoUrl) {
        toast.error('Aucune vidéo générée');
        return null;
      }

      const assembledVideo: AssembledVideo = {
        videoId: params.videoId,
        url: data.videoUrl,
        thumbnailUrl: data.thumbnailUrl || params.frames.hero,
        duration: 10,
        format: 'mp4',
        size: data.size || 0,
        createdAt: new Date().toISOString()
      };

      setAssembledVideos(prev => ({
        ...prev,
        [params.videoId]: assembledVideo
      }));

      setAssemblyProgress(100);
      toast.success('Vidéo assemblée avec succès! 🎬');
      
      return assembledVideo;

    } catch (error) {
      console.error('Error in video assembly:', error);
      toast.error('Erreur lors du montage vidéo');
      return null;
    } finally {
      setIsAssembling(false);
      setTimeout(() => setAssemblyProgress(0), 2000);
    }
  };

  const downloadVideo = async (videoUrl: string, fileName: string) => {
    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Vidéo téléchargée!');
    } catch (error) {
      console.error('Error downloading video:', error);
      toast.error('Erreur lors du téléchargement');
    }
  };

  return {
    isAssembling,
    assemblyProgress,
    assembledVideos,
    assembleVideo,
    downloadVideo
  };
};
