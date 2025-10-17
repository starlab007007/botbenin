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

export type AssemblyStep = 
  | 'preparing'
  | 'processing_frames'
  | 'adding_transitions'
  | 'adding_overlays'
  | 'adding_audio'
  | 'finalizing'
  | 'uploading'
  | 'completed'
  | 'error';

interface AssemblyStatus {
  step: AssemblyStep;
  progress: number;
  message: string;
}

export const useVideoAssembly = () => {
  const [isAssembling, setIsAssembling] = useState(false);
  const [assemblyStatus, setAssemblyStatus] = useState<AssemblyStatus>({
    step: 'preparing',
    progress: 0,
    message: ''
  });
  const [assembledVideos, setAssembledVideos] = useState<Record<string, AssembledVideo>>({});

  const updateStatus = (step: AssemblyStep, progress: number, message: string) => {
    setAssemblyStatus({ step, progress, message });
  };

  const assembleVideo = async (params: AssembleVideoParams): Promise<AssembledVideo | null> => {
    setIsAssembling(true);
    updateStatus('preparing', 0, 'Préparation du montage...');

    try {
      toast.info('Démarrage du montage vidéo...');
      
      updateStatus('processing_frames', 10, 'Traitement des frames...');
      await new Promise(resolve => setTimeout(resolve, 500));

      updateStatus('adding_transitions', 30, 'Ajout des transitions...');
      await new Promise(resolve => setTimeout(resolve, 500));

      updateStatus('adding_overlays', 50, 'Ajout des textes et logos...');
      await new Promise(resolve => setTimeout(resolve, 500));

      updateStatus('adding_audio', 70, 'Intégration de la musique...');
      
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
        updateStatus('error', 0, 'Erreur lors du montage');
        
        if (error.message?.includes('429') || error.message?.includes('Rate limit')) {
          toast.error('Limite de taux atteinte. Réessayez dans quelques instants.');
        } else if (error.message?.includes('credits')) {
          toast.error('Crédits insuffisants pour le montage vidéo.');
        } else {
          toast.error('Erreur lors du montage: ' + error.message);
        }
        return null;
      }

      updateStatus('uploading', 90, 'Finalisation et upload...');
      await new Promise(resolve => setTimeout(resolve, 500));

      if (!data?.videoUrl) {
        updateStatus('error', 0, 'Aucune vidéo générée');
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

      updateStatus('completed', 100, 'Vidéo assemblée avec succès!');
      toast.success('Vidéo assemblée avec succès! 🎬');
      
      return assembledVideo;

    } catch (error) {
      console.error('Error in video assembly:', error);
      updateStatus('error', 0, 'Erreur lors du montage vidéo');
      toast.error('Erreur lors du montage vidéo');
      return null;
    } finally {
      setIsAssembling(false);
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
    assemblyStatus,
    assembledVideos,
    assembleVideo,
    downloadVideo
  };
};
