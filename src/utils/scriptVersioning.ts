import { supabase } from '@/integrations/supabase/client';

export interface ScriptVersion {
  id: string;
  video_id: string;
  script_text: string;
  script_length: 'short' | 'medium' | 'long';
  voice_id?: string;
  audio_url?: string;
  audio_duration?: number;
  is_active: boolean;
  created_at: string;
}

export const saveScriptVersion = async (
  videoId: string,
  scriptText: string,
  scriptLength: 'short' | 'medium' | 'long',
  voiceId?: string,
  isActive: boolean = false
): Promise<ScriptVersion | null> => {
  try {
    // Si c'est la version active, désactiver les autres
    if (isActive) {
      await supabase
        .from('video_descriptions')
        .update({ is_active: false })
        .eq('video_id', videoId);
    }

    const { data, error } = await supabase
      .from('video_descriptions')
      .insert({
        video_id: videoId,
        script_text: scriptText,
        script_length: scriptLength,
        voice_id: voiceId,
        is_active: isActive
      })
      .select()
      .single();

    if (error) throw error;
    return data as ScriptVersion;
  } catch (error) {
    console.error('Error saving script version:', error);
    return null;
  }
};

export const loadScriptVersions = async (videoId: string): Promise<ScriptVersion[]> => {
  try {
    const { data, error } = await supabase
      .from('video_descriptions')
      .select('*')
      .eq('video_id', videoId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data as ScriptVersion[]) || [];
  } catch (error) {
    console.error('Error loading script versions:', error);
    return [];
  }
};

export const setActiveScriptVersion = async (
  videoId: string,
  versionId: string
): Promise<boolean> => {
  try {
    // Désactiver toutes les versions
    await supabase
      .from('video_descriptions')
      .update({ is_active: false })
      .eq('video_id', videoId);

    // Activer la version sélectionnée
    const { error } = await supabase
      .from('video_descriptions')
      .update({ is_active: true })
      .eq('id', versionId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error setting active version:', error);
    return false;
  }
};

export const deleteScriptVersion = async (versionId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('video_descriptions')
      .delete()
      .eq('id', versionId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting script version:', error);
    return false;
  }
};
