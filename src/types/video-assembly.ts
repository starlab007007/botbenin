export interface AssemblyConfig {
  frameDurations: number[]; // Durée de chaque frame en secondes
  transitions: ('slide' | 'fade' | 'zoom' | 'cut')[];
  musicId: string;
  musicVolume: number; // 0-1
  templateId: string;
  textOverlays: {
    hook: TextOverlay;
    content: TextOverlay[];
    cta: TextOverlay;
  };
}

export interface TextOverlay {
  text: string;
  position: { x: number | 'center'; y: number };
  fontSize: number;
  fontColor: string;
  fontFamily: string;
  duration: [number, number]; // [start, end] en secondes
  animation?: 'fadeIn' | 'slideIn' | 'none';
}

export interface MusicTrack {
  id: string;
  name: string;
  url: string;
  duration: number;
  bpm: number;
  mood: 'energetic' | 'professional' | 'calm' | 'upbeat';
  license: string;
}

export interface VideoTemplate {
  id: string;
  name: string;
  description: string;
  frameDurations: number[];
  transitions: ('slide' | 'fade' | 'zoom' | 'cut')[];
  textPositions: {
    hook: { x: number | 'center'; y: number };
    content: { x: number | 'center'; y: number };
    cta: { x: number | 'center'; y: number };
  };
  musicVolume: number;
}

export interface AssembledVideo {
  videoId: string;
  url: string;
  thumbnailUrl: string;
  duration: number;
  format: string;
  size: number;
  createdAt: string;
}

export interface PublishPlatform {
  id: 'tiktok' | 'instagram' | 'youtube' | 'whatsapp';
  name: string;
  icon: string;
  specs: {
    maxDuration: number;
    resolution: string;
    aspectRatio: string;
    maxSize: number;
  };
}
