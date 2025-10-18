import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ScriptVersion } from '@/utils/scriptVersioning';

interface VideoFrame {
  id: string;
  video_id: string;
  frame_type: string;
  image_url: string;
  prompt: string;
  created_at: string;
}

interface AudioAsset {
  id: string;
  video_id: string;
  script_text: string;
  audio_url: string;
  audio_duration: number;
  voice_id: string;
  created_at: string;
}

interface VideoAsset {
  id: string;
  video_id: string;
  video_title: string;
  video_url: string;
  rendered_video_url?: string;
  thumbnail_url?: string;
  created_at: string;
}

export const useVideoAssets = () => {
  const [scripts, setScripts] = useState<ScriptVersion[]>([]);
  const [audios, setAudios] = useState<AudioAsset[]>([]);
  const [frames, setFrames] = useState<VideoFrame[]>([]);
  const [videos, setVideos] = useState<VideoAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAllAssets();
  }, []);

  const loadAllAssets = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadScripts(),
        loadAudios(),
        loadFrames(),
        loadVideos()
      ]);
    } catch (error) {
      console.error('Error loading assets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadScripts = async () => {
    const { data, error } = await supabase
      .from('video_descriptions')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setScripts(data as ScriptVersion[]);
    }
  };

  const loadAudios = async () => {
    const { data, error } = await supabase
      .from('video_descriptions')
      .select('*')
      .not('audio_url', 'is', null)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setAudios(data.map(d => ({
        id: d.id,
        video_id: d.video_id,
        script_text: d.script_text,
        audio_url: d.audio_url!,
        audio_duration: d.audio_duration || 0,
        voice_id: d.voice_id || '',
        created_at: d.created_at
      })));
    }
  };

  const loadFrames = async () => {
    const { data, error } = await supabase
      .from('video_frames')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setFrames(data);
    }
  };

  const loadVideos = async () => {
    const { data, error } = await supabase
      .from('generated_videos')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setVideos(data);
    }
  };

  return {
    scripts,
    audios,
    frames,
    videos,
    isLoading,
    refresh: loadAllAssets
  };
};
