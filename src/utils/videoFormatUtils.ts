export interface VideoFormatPreset {
  name: string;
  width: number;
  height: number;
  fps: number;
  maxDuration: number;
  format: string;
  codec: string;
  audioBitrate?: number;
}

export const EXPORT_PRESETS: Record<string, VideoFormatPreset> = {
  tiktok: {
    name: 'TikTok / Instagram Reels',
    width: 1080,
    height: 1920,
    fps: 30,
    maxDuration: 60,
    format: 'mp4',
    codec: 'h264',
    audioBitrate: 128
  },
  facebook: {
    name: 'Facebook / Instagram Feed',
    width: 1080,
    height: 1080,
    fps: 30,
    maxDuration: 240,
    format: 'mp4',
    codec: 'h264',
    audioBitrate: 128
  },
  youtube: {
    name: 'YouTube Shorts',
    width: 1080,
    height: 1920,
    fps: 30,
    maxDuration: 60,
    format: 'mp4',
    codec: 'h264',
    audioBitrate: 128
  },
  universal: {
    name: 'Universel (tous appareils)',
    width: 1080,
    height: 1920,
    fps: 30,
    maxDuration: 300,
    format: 'mp4',
    codec: 'h264',
    audioBitrate: 128
  }
};

export const getOptimalBitrate = (width: number, height: number, fps: number): number => {
  const pixels = width * height;
  const pixelsPerSecond = pixels * fps;
  
  // Formule approximative : 0.1 bits par pixel par seconde
  return Math.round((pixelsPerSecond * 0.1) / 1000); // en kbps
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

export const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
};

export const validateVideoFormat = (format: string, codec: string): boolean => {
  const validFormats = ['mp4', 'webm', 'mov'];
  const validCodecs = ['h264', 'h265', 'vp8', 'vp9'];
  
  return validFormats.includes(format.toLowerCase()) && 
         validCodecs.includes(codec.toLowerCase());
};
