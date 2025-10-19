import { useState, useRef } from 'react';
import { toast } from 'sonner';

interface RecordingOptions {
  canvas: HTMLCanvasElement;
  duration: number;
  fps: number;
  mimeType?: string;
}

export const useVideoRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async (
    options: RecordingOptions,
    onComplete: (videoBlob: Blob, videoUrl: string) => void
  ): Promise<void> => {
    const { canvas, duration, fps, mimeType = 'video/webm;codecs=vp9' } = options;

    try {
      // Check for MediaRecorder support
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        // Fallback to a more widely supported format
        const fallbackMimeType = 'video/webm';
        if (!MediaRecorder.isTypeSupported(fallbackMimeType)) {
          throw new Error('Video recording not supported in this browser');
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
      console.error('Error starting recording:', error);
      toast.error('Impossible de démarrer l\'enregistrement');
      setIsRecording(false);
      throw error;
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const convertToMP4 = async (webmBlob: Blob): Promise<Blob> => {
    // This is a placeholder - actual MP4 conversion would require ffmpeg.wasm
    // For now, we'll return the WebM blob as-is
    // In a production app, you'd want to convert to MP4 for better compatibility
    
    console.warn('MP4 conversion not implemented, returning WebM');
    return webmBlob;
  };

  return {
    isRecording,
    recordingProgress,
    startRecording,
    stopRecording,
    convertToMP4,
  };
};
