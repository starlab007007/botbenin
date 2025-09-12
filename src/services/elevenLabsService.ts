import { supabase } from '@/integrations/supabase/client';

export interface TranscriptionResult {
  text: string;
  confidence?: number;
}

export interface SynthesisResult {
  audioUrl: string;
  audioBlob: Blob;
}

class ElevenLabsService {
  private async getApiKey(): Promise<string> {
    // The API key will be available in the Edge Function environment
    // This is a placeholder for client-side usage
    return 'api_key_handled_by_edge_function';
  }

  async transcribeAudio(audioBlob: Blob): Promise<TranscriptionResult> {
    try {
      // Convert blob to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      
      // Use Supabase Edge Function for transcription
      const { data, error } = await supabase.functions.invoke('voice-to-text', {
        body: { audio: base64Audio }
      });

      if (error) {
        throw new Error(error.message);
      }

      return { text: data.text };
    } catch (error) {
      console.error('Transcription error:', error);
      throw new Error('Erreur lors de la transcription vocale');
    }
  }

  async synthesizeText(text: string, voiceId: string = 'EXAVITQu4vr4xnSDxMaL'): Promise<SynthesisResult> {
    try {
      // Use Supabase Edge Function for synthesis
      const { data, error } = await supabase.functions.invoke('text-to-voice', {
        body: { 
          text, 
          voice_id: voiceId,
          model_id: 'eleven_multilingual_v2'
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      // Convert base64 back to blob
      const binaryString = atob(data.audioContent);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const audioBlob = new Blob([bytes], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      return { audioUrl, audioBlob };
    } catch (error) {
      console.error('Synthesis error:', error);
      throw new Error('Erreur lors de la synthèse vocale');
    }
  }

  // Play audio from text
  async playText(text: string, voiceId?: string): Promise<void> {
    try {
      const { audioUrl } = await this.synthesizeText(text, voiceId);
      const audio = new Audio(audioUrl);
      await audio.play();
    } catch (error) {
      console.error('Play text error:', error);
      throw new Error('Erreur lors de la lecture audio');
    }
  }
}

export const elevenLabsService = new ElevenLabsService();