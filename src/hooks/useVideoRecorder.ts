import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

interface RecordingOptions {
  canvas: HTMLCanvasElement;
  duration: number;
  fps: number;
  mimeType?: string;
}

// Détection Safari
const isSafari = () => {
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes('safari') && !ua.includes('chrome') && !ua.includes('android');
};

export const useVideoRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const ffmpegRef = useRef<FFmpeg | null>(null);

  // Méthode FFmpeg pour Safari et navigateurs incompatibles
  const startRecordingWithFFmpeg = async (
    options: RecordingOptions,
    onComplete: (videoBlob: Blob, videoUrl: string) => void
  ): Promise<void> => {
    const { canvas, duration, fps } = options;
    
    try {
      setIsRecording(true);
      
      // Charger FFmpeg si nécessaire
      if (!ffmpegRef.current) {
        const ffmpeg = new FFmpeg();
        ffmpeg.on('log', ({ message }) => console.log('[FFmpeg]:', message));
        
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
        const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript');
        const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm');
        
        await ffmpeg.load({ coreURL, wasmURL });
        ffmpegRef.current = ffmpeg;
      }
      
      const ffmpeg = ffmpegRef.current;
      const totalFrames = Math.floor(duration * fps);
      const frames: string[] = [];
      
      // Capturer toutes les frames
      for (let i = 0; i < totalFrames; i++) {
        // Attendre le prochain frame d'animation
        await new Promise(resolve => requestAnimationFrame(resolve));
        
        // Capturer le frame actuel
        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((b) => resolve(b!), 'image/png');
        });
        
        const fileName = `frame${String(i).padStart(5, '0')}.png`;
        await ffmpeg.writeFile(fileName, await fetchFile(blob));
        frames.push(fileName);
        
        const progress = i / totalFrames;
        setRecordingProgress(progress);
      }
      
      // Créer la vidéo MP4
      await ffmpeg.exec([
        '-framerate', fps.toString(),
        '-pattern_type', 'glob',
        '-i', 'frame*.png',
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '23',
        '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
        'output.mp4'
      ]);
      
      // Lire le fichier de sortie
      const data = await ffmpeg.readFile('output.mp4');
      const videoData = data instanceof Uint8Array ? data : new Uint8Array(await (await fetch(data as string)).arrayBuffer());
      // Créer un nouveau Uint8Array avec un ArrayBuffer classique
      const videoArray = new Uint8Array(videoData);
      const videoBlob = new Blob([videoArray], { type: 'video/mp4' });
      const videoUrl = URL.createObjectURL(videoBlob);
      
      // Nettoyer les fichiers temporaires
      for (const frame of frames) {
        try {
          await ffmpeg.deleteFile(frame);
        } catch (e) {
          console.warn('Could not delete frame:', frame);
        }
      }
      
      setIsRecording(false);
      setRecordingProgress(0);
      onComplete(videoBlob, videoUrl);
      
    } catch (error) {
      console.error('FFmpeg recording error:', error);
      toast.error('Erreur lors de l\'enregistrement avec FFmpeg');
      setIsRecording(false);
      throw error;
    }
  };

  // Méthode MediaRecorder pour navigateurs supportés
  const startRecordingWithMediaRecorder = async (
    options: RecordingOptions,
    onComplete: (videoBlob: Blob, videoUrl: string) => void
  ): Promise<void> => {
    const { canvas, duration, fps, mimeType = 'video/webm;codecs=vp9' } = options;

    try {
      // Check for MediaRecorder support
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        const fallbackMimeType = 'video/webm';
        if (!MediaRecorder.isTypeSupported(fallbackMimeType)) {
          throw new Error('MediaRecorder not supported');
        }
        console.warn(`${mimeType} not supported, using ${fallbackMimeType}`);
      }

      // Get canvas stream
      const stream = canvas.captureStream(fps);
      
      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : 'video/webm',
        videoBitsPerSecond: 8000000, // 8 Mbps for high quality
      });

      chunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      // Handle data available
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      // Handle recording stop
      mediaRecorder.onstop = () => {
        const videoBlob = new Blob(chunksRef.current, { 
          type: mediaRecorder.mimeType 
        });
        const videoUrl = URL.createObjectURL(videoBlob);
        
        setIsRecording(false);
        setRecordingProgress(0);
        onComplete(videoBlob, videoUrl);
      };

      // Handle errors
      mediaRecorder.onerror = (event: Event) => {
        console.error('MediaRecorder error:', event);
        toast.error('Erreur lors de l\'enregistrement vidéo');
        setIsRecording(false);
      };

      // Start recording
      setIsRecording(true);
      mediaRecorder.start(100); // Collect data every 100ms

      // Track progress
      const startTime = Date.now();
      const progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / (duration * 1000), 1);
        setRecordingProgress(progress);

        if (progress >= 1) {
          clearInterval(progressInterval);
        }
      }, 100);

      // Auto-stop after duration
      setTimeout(() => {
        clearInterval(progressInterval);
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      }, duration * 1000);

    } catch (error) {
      console.error('MediaRecorder error:', error);
      setIsRecording(false);
      throw error;
    }
  };

  // Point d'entrée principal - détecte le navigateur et utilise la bonne méthode
  const startRecording = async (
    options: RecordingOptions,
    onComplete: (videoBlob: Blob, videoUrl: string) => void
  ): Promise<void> => {
    try {
      // Vérifier si canvas.captureStream est disponible
      const canvas = options.canvas;
      const hasCaptureStream = 'captureStream' in canvas || 'mozCaptureStream' in canvas;
      
      // Toujours utiliser FFmpeg sur Safari ou si captureStream n'est pas disponible
      if (isSafari() || !hasCaptureStream) {
        console.log('Using FFmpeg method (Safari or no captureStream support)');
        toast.info('Préparation de l\'enregistrement (compatible tous navigateurs)...', { 
          duration: 2000 
        });
        return await startRecordingWithFFmpeg(options, onComplete);
      } else {
        console.log('Using MediaRecorder method');
        try {
          return await startRecordingWithMediaRecorder(options, onComplete);
        } catch (error) {
          console.warn('MediaRecorder failed, falling back to FFmpeg:', error);
          toast.info('Changement de méthode d\'enregistrement...', { duration: 2000 });
          return await startRecordingWithFFmpeg(options, onComplete);
        }
      }
    } catch (error) {
      console.error('Recording error:', error);
      toast.error('Erreur lors de l\'enregistrement vidéo');
      setIsRecording(false);
      throw error;
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  return {
    isRecording,
    recordingProgress,
    startRecording,
    stopRecording,
  };
};
