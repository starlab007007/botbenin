import { supabase } from '@/integrations/supabase/client';

export interface AudioGenerationParams {
  scriptText: string;
  voiceId?: string;
  speed?: number;
  targetDuration?: number;
}

export interface AudioGenerationResult {
  audioUrl: string;
  audioBlob: Blob;
  duration: number;
}

class VideoAudioService {
  /**
   * Génère un fichier audio à partir d'un script texte
   */
  async generateAudio(params: AudioGenerationParams): Promise<AudioGenerationResult> {
    try {
      const {
        scriptText,
        voiceId = 'EXAVITQu4vr4xnSDxMaL', // Sarah (voix par défaut)
        speed = 1.0,
        targetDuration
      } = params;

      console.log('Génération audio avec ElevenLabs...', { 
        textLength: scriptText.length, 
        voiceId, 
        speed,
        targetDuration 
      });

      // Ajuster la vitesse si une durée cible est spécifiée
      let adjustedSpeed = speed;
      if (targetDuration) {
        const estimatedDuration = (scriptText.split(/\s+/).length / 2.5); // 2.5 mots/sec
        adjustedSpeed = Math.max(0.5, Math.min(2.0, estimatedDuration / targetDuration));
      }

      const { data, error } = await supabase.functions.invoke('text-to-voice', {
        body: {
          text: scriptText,
          voice_id: voiceId,
          model_id: 'eleven_multilingual_v2',
          speed: adjustedSpeed
        }
      });

      if (error) {
        throw new Error(`Erreur ElevenLabs: ${error.message}`);
      }

      if (!data?.audioContent) {
        throw new Error('Pas de contenu audio reçu');
      }

      // Convertir base64 en Blob
      const binaryString = atob(data.audioContent);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const audioBlob = new Blob([bytes], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);

      // Obtenir la durée réelle de l'audio
      const duration = await this.getAudioDuration(audioUrl);

      console.log('Audio généré avec succès:', { duration, size: audioBlob.size });

      return { audioUrl, audioBlob, duration };

    } catch (error) {
      console.error('Erreur génération audio:', error);
      throw new Error(`Impossible de générer l'audio: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  /**
   * Obtient la durée d'un fichier audio
   */
  private async getAudioDuration(url: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const audio = new Audio(url);
      audio.addEventListener('loadedmetadata', () => {
        resolve(audio.duration);
      });
      audio.addEventListener('error', () => {
        reject(new Error('Impossible de charger les métadonnées audio'));
      });
    });
  }

  /**
   * Upload l'audio vers Supabase Storage et retourne l'URL publique
   */
  async uploadAudioToStorage(audioBlob: Blob, videoId: string): Promise<string> {
    try {
      const fileName = `audio-description-${videoId}-${Date.now()}.mp3`;
      const filePath = `video-audio/${fileName}`;

      const { data, error } = await supabase.storage
        .from('video-assets')
        .upload(filePath, audioBlob, {
          contentType: 'audio/mpeg',
          upsert: false
        });

      if (error) {
        throw new Error(`Erreur upload: ${error.message}`);
      }

      // Obtenir l'URL publique
      const { data: urlData } = supabase.storage
        .from('video-assets')
        .getPublicUrl(filePath);

      if (!urlData?.publicUrl) {
        throw new Error('Impossible d\'obtenir l\'URL publique');
      }

      console.log('Audio uploadé avec succès:', urlData.publicUrl);
      return urlData.publicUrl;

    } catch (error) {
      console.error('Erreur upload audio:', error);
      throw error;
    }
  }

  /**
   * Sauvegarde la description dans la base de données
   */
  async saveVideoDescription(params: {
    videoId: string;
    scriptText: string;
    scriptLength: 'short' | 'medium' | 'long';
    audioUrl: string;
    audioDuration: number;
    voiceId: string;
  }) {
    try {
      const { data, error } = await supabase
        .from('video_descriptions')
        .insert({
          video_id: params.videoId,
          script_text: params.scriptText,
          script_length: params.scriptLength,
          audio_url: params.audioUrl,
          audio_duration: params.audioDuration,
          voice_id: params.voiceId,
          is_active: true
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Erreur sauvegarde description: ${error.message}`);
      }

      console.log('Description sauvegardée:', data);
      return data;

    } catch (error) {
      console.error('Erreur sauvegarde description:', error);
      throw error;
    }
  }
}

export const videoAudioService = new VideoAudioService();
