export type VideoStatus = 'to_produce' | 'in_progress' | 'completed' | 'published';
export type VideoPlatform = 'tiktok' | 'instagram' | 'youtube' | 'whatsapp';
export type VideoSeries = 'lancement' | 'whatsapp' | 'prospects' | 'createur' | 'chatbot' | 'guides' | 'paiement' | 'temoignages';

export interface VideoProduction {
  id: string;
  series: VideoSeries;
  title: string;
  description: string;
  hook: string;
  content: string[];
  cta: string;
  duration: number; // en secondes
  status: VideoStatus;
  platforms: VideoPlatform[];
  publicationDate?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  hashtags: string[];
  priority: number;
}

export interface ProductionStats {
  total: number;
  toProduceCount: number;
  inProgressCount: number;
  completedCount: number;
  publishedCount: number;
}
