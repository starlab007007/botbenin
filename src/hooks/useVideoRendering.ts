import { useState, useRef } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { toast } from 'sonner';
import { AssemblyConfig } from '@/types/video-assembly';
import { AssemblyStep } from './useVideoAssembly';

interface RenderVideoParams {
  frames: {
    hero: string;
    demo: string;
    result: string;
    cta: string;
  };
  config: AssemblyConfig;
  videoTitle: string;
}

interface RenderStatus {
  step: AssemblyStep;
  progress: number;
  message: string;
}

export const useVideoRendering = () => {
  const [isRendering, setIsRendering] = useState(false);
  const [renderStatus, setRenderStatus] = useState<RenderStatus>({
    step: 'preparing',
    progress: 0,
    message: ''
  });
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const [isFFmpegLoaded, setIsFFmpegLoaded] = useState(false);

  const loadFFmpeg = async () => {
    if (ffmpegRef.current) {
      console.log('FFmpeg already loaded');
      return;
    }

    console.log('🎬 Starting FFmpeg initialization...');
    const ffmpeg = new FFmpeg();
    
    ffmpeg.on('log', ({ message }) => {
      console.log('[FFmpeg]:', message);
    });

    ffmpeg.on('progress', ({ progress }) => {
      console.log('[FFmpeg Progress]:', progress);
      setRenderStatus(prev => ({
        ...prev,
        progress: Math.round(prev.progress + (progress * 10))
      }));
    });

    try {
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
      console.log('📦 Loading FFmpeg core from:', baseURL);
      
      const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript');
      const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm');
      
      console.log('✅ Core URLs loaded, initializing FFmpeg...');
      
      await ffmpeg.load({
        coreURL,
        wasmURL,
      });
      
      ffmpegRef.current = ffmpeg;
      setIsFFmpegLoaded(true);
      console.log('✅ FFmpeg loaded successfully!');
      toast.success('Moteur vidéo prêt! 🎬');
    } catch (error) {
      console.error('❌ Failed to load FFmpeg:', error);
      toast.error('Erreur lors du chargement du moteur vidéo');
      throw error;
    }
  };

  const updateStatus = (step: AssemblyStep, progress: number, message: string) => {
    setRenderStatus({ step, progress, message });
  };

  const renderVideo = async ({ frames, config, videoTitle }: RenderVideoParams): Promise<string | null> => {
    setIsRendering(true);
    updateStatus('preparing', 0, 'Initialisation du moteur de rendu...');

    try {
      // Load FFmpeg
      if (!ffmpegRef.current) {
        await loadFFmpeg();
      }
      const ffmpeg = ffmpegRef.current!;

      updateStatus('processing_frames', 10, 'Traitement des frames...');

      // Write frames to FFmpeg virtual filesystem
      await ffmpeg.writeFile('hero.png', await fetchFile(frames.hero));
      await ffmpeg.writeFile('demo.png', await fetchFile(frames.demo));
      await ffmpeg.writeFile('result.png', await fetchFile(frames.result));
      await ffmpeg.writeFile('cta.png', await fetchFile(frames.cta));

      updateStatus('adding_transitions', 30, 'Ajout des transitions...');

      // Create video segments with proper durations
      const durations = config.frameDurations;
      
      // Create video from images with transitions
      await ffmpeg.exec([
        '-loop', '1',
        '-t', durations[0].toString(),
        '-i', 'hero.png',
        '-loop', '1',
        '-t', durations[1].toString(),
        '-i', 'demo.png',
        '-loop', '1',
        '-t', durations[2].toString(),
        '-i', 'result.png',
        '-loop', '1',
        '-t', durations[3].toString(),
        '-i', 'cta.png',
        '-filter_complex',
        `[0:v]fade=t=out:st=${durations[0] - 0.5}:d=0.5,scale=1080:1920,setsar=1[v0];
         [1:v]fade=t=in:st=0:d=0.5,fade=t=out:st=${durations[1] - 0.5}:d=0.5,scale=1080:1920,setsar=1[v1];
         [2:v]fade=t=in:st=0:d=0.5,fade=t=out:st=${durations[2] - 0.5}:d=0.5,scale=1080:1920,setsar=1[v2];
         [3:v]fade=t=in:st=0:d=0.5,scale=1080:1920,setsar=1[v3];
         [v0][v1][v2][v3]concat=n=4:v=1:a=0[outv]`,
        '-map', '[outv]',
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '23',
        '-pix_fmt', 'yuv420p',
        '-r', '30',
        'output.mp4'
      ]);

      updateStatus('finalizing', 90, 'Finalisation de la vidéo...');

      // Read the output video
      const data = await ffmpeg.readFile('output.mp4');
      const videoData = data instanceof Uint8Array ? data : new Uint8Array(await (await fetch(data as string)).arrayBuffer());
      // Create a copy to ensure compatibility with Blob
      const videoBuffer = new Uint8Array(videoData);
      const blob = new Blob([videoBuffer.buffer], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);

      updateStatus('completed', 100, 'Vidéo générée avec succès!');
      toast.success('Vidéo générée avec succès! 🎬');

      return url;

    } catch (error) {
      console.error('Error rendering video:', error);
      updateStatus('error', 0, 'Erreur lors du rendu vidéo');
      toast.error('Erreur lors de la génération de la vidéo');
      return null;
    } finally {
      setIsRendering(false);
    }
  };

  return {
    isRendering,
    renderStatus,
    isFFmpegLoaded,
    renderVideo,
    loadFFmpeg
  };
};
