import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type PromotionalStyle = 'epic' | 'professional' | 'casual' | 'urgent';
export type FrameType = 'hero' | 'demo' | 'result' | 'cta';

interface GeneratedText {
  frameType: FrameType;
  promotionalText: string;
  characterCount: number;
  wordCount: number;
  style: PromotionalStyle;
  generatedAt: string;
}

export const usePromotionalTextGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const generateFrameText = async (
    frameId: string,
    frameType: FrameType,
    framePrompt: string,
    style: PromotionalStyle = 'epic',
    africaContext?: string
  ): Promise<string | null> => {
    try {
      setIsGenerating(true);
      
      const { data, error } = await supabase.functions.invoke('generate-frame-promotional-text', {
        body: { frameType, framePrompt, style, africaContext }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(`Edge function error: ${error.message || 'Fonction non déployée'}`);
      }

      if (!data?.promotionalText) {
        throw new Error('No promotional text generated');
      }

      const generated: GeneratedText = data;

      // Sauvegarder dans la base de données
      const { error: updateError } = await supabase
        .from('video_frames')
        .update({
          promotional_text: generated.promotionalText,
          promotional_text_generated_at: new Date().toISOString(),
          promotional_style: style,
          promotional_text_word_count: generated.wordCount,
          promotional_text_char_count: generated.characterCount
        })
        .eq('id', frameId);

      if (updateError) throw updateError;

      toast({
        title: 'Texte généré',
        description: `Texte promotionnel créé pour la frame ${frameType.toUpperCase()}`
      });

      return generated.promotionalText;
    } catch (error) {
      console.error('Error generating frame text:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      
      toast({
        title: 'Erreur de génération',
        description: errorMessage.includes('404') || errorMessage.includes('non déployée')
          ? "Les edge functions ne sont pas encore déployées. Veuillez rafraîchir la page ou attendre quelques minutes."
          : `Impossible de générer le texte: ${errorMessage}`,
        variant: 'destructive'
      });
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const generateAllFrameTexts = async (
    frames: Array<{ id: string; frame_type: FrameType; prompt: string }>,
    style: PromotionalStyle,
    africaContext?: string
  ): Promise<boolean> => {
    try {
      setIsGenerating(true);
      
      const promises = frames.map(frame => 
        generateFrameText(frame.id, frame.frame_type, frame.prompt, style, africaContext)
      );

      const results = await Promise.all(promises);
      
      const allSuccess = results.every(result => result !== null);
      
      if (allSuccess) {
        toast({
          title: 'Textes générés',
          description: 'Tous les textes promotionnels ont été créés avec succès'
        });
      }

      return allSuccess;
    } catch (error) {
      console.error('Error generating all frame texts:', error);
      toast({
        title: 'Erreur',
        description: 'Erreur lors de la génération des textes',
        variant: 'destructive'
      });
      return false;
    } finally {
      setIsGenerating(false);
    }
  };

  const generateVideoSummary = async (
    videoId: string,
    heroText: string,
    demoText: string,
    resultText: string,
    ctaText: string,
    duration: number = 30
  ): Promise<string | null> => {
    try {
      setIsGenerating(true);

      const { data, error } = await supabase.functions.invoke('generate-video-promotional-summary', {
        body: { heroText, demoText, resultText, ctaText, duration }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(`Edge function error: ${error.message || 'Fonction non déployée'}`);
      }

      if (!data?.promotionalSummary) {
        throw new Error('No promotional summary generated');
      }

      // Sauvegarder dans la base de données
      const { error: updateError } = await supabase
        .from('generated_videos')
        .update({
          promotional_summary: data.promotionalSummary,
          promotional_summary_generated_at: new Date().toISOString()
        })
        .eq('video_id', videoId);

      if (updateError) {
        console.error('Database update error:', updateError);
        throw updateError;
      }

      toast({
        title: 'Résumé créé',
        description: 'Résumé promotionnel vidéo généré avec succès'
      });

      return data.promotionalSummary;
    } catch (error) {
      console.error('Error generating video summary:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      
      toast({
        title: 'Erreur de génération',
        description: errorMessage.includes('404') || errorMessage.includes('non déployée')
          ? "Les edge functions ne sont pas encore déployées."
          : `Impossible de générer le résumé: ${errorMessage}`,
        variant: 'destructive'
      });
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generateFrameText,
    generateAllFrameTexts,
    generateVideoSummary,
    isGenerating
  };
};
