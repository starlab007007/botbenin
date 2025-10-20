import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PROMOTIONAL_TEXT_EXAMPLES } from '@/data/promotionalTextExamples';

export type PromotionalStyle = 'epic' | 'professional' | 'casual' | 'urgent';
export type FrameType = 'hero' | 'demo' | 'result' | 'cta';

export const usePromotionalTextGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const { toast } = useToast();

  // Test de disponibilité de la fonction
  const checkFunctionAvailability = async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-promotional-texts', {
        body: { action: 'health-check' }
      });
      
      return !error && data?.status === 'ok';
    } catch {
      return false;
    }
  };

  // Retry logic avec backoff exponentiel
  const retryWithBackoff = async <T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    delayMs = 1000
  ): Promise<T> => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        
        const backoffDelay = delayMs * Math.pow(2, i);
        console.warn(`🔄 Tentative ${i + 1}/${maxRetries} échouée, retry dans ${backoffDelay}ms`);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      }
    }
    throw new Error('Max retries exceeded');
  };

  const generateFrameText = async (
    frameId: string,
    frameType: FrameType,
    framePrompt: string,
    style: PromotionalStyle = 'epic',
    africaContext?: string
  ): Promise<string | null> => {
    const logContext = {
      frameId,
      frameType,
      style,
      timestamp: new Date().toISOString()
    };
    
    console.log('🎬 [START] generateFrameText', logContext);
    
    try {
      // ✅ VÉRIFICATION SESSION AU DÉBUT
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user) {
        toast({
          title: '🔐 Authentification requise',
          description: 'Veuillez vous reconnecter pour générer des textes',
          variant: 'destructive'
        });
        console.error('❌ [AUTH ERROR] No valid session', { sessionError });
        return null;
      }

      console.log('✅ [AUTH] Session valide', { userId: session.user.id });
      setIsGenerating(true);

      // Vérifier disponibilité
      const isAvailable = await checkFunctionAvailability();
      
      if (!isAvailable && !useFallback) {
        toast({
          title: '⏳ Fonction en déploiement',
          description: 'Utilisation du mode démo avec textes exemples',
        });
        setUseFallback(true);
      }

      let promotionalText: string;

      if (useFallback || !isAvailable) {
        // Mode fallback avec textes exemples
        promotionalText = PROMOTIONAL_TEXT_EXAMPLES[frameType][style];
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simule génération
      } else {
        // Mode production avec Lovable AI + Retry logic
        const data = await retryWithBackoff(async () => {
          console.log('🤖 [AI] Appel Lovable AI...');
          const { data, error } = await supabase.functions.invoke('generate-promotional-texts', {
            body: { 
              action: 'generate-frame-text',
              frameType, 
              framePrompt, 
              style, 
              africaContext 
            }
          });

          if (error) {
            console.error('❌ [AI ERROR]', error);
            
            // Gestion spécifique des erreurs AI
            if (error.message?.includes('429')) {
              throw new Error('Limite de requêtes atteinte. Réessayez dans quelques secondes.');
            }
            if (error.message?.includes('402')) {
              throw new Error('Crédits Lovable AI insuffisants. Rechargez votre compte.');
            }
            
            throw error;
          }

          if (!data?.promotionalText) {
            throw new Error('No promotional text generated');
          }

          return data;
        });

        promotionalText = data.promotionalText;
        console.log('✅ [AI SUCCESS]', { textLength: promotionalText.length });
      }

      // Sauvegarder en base de données avec word_count et char_count
      console.log('💾 [DB] Sauvegarde du texte...');
      const { error: updateError } = await supabase
        .from('video_frames')
        .update({
          promotional_text: promotionalText,
          promotional_text_generated_at: new Date().toISOString(),
          promotional_style: style,
          promotional_text_word_count: promotionalText.split(/\s+/).length,
          promotional_text_char_count: promotionalText.length
        })
        .eq('id', frameId);

      if (updateError) {
        // ✅ ANALYSE DÉTAILLÉE DE L'ERREUR RLS
        if (updateError.code === 'PGRST116') {
          const errorMsg = 'Vous ne pouvez modifier que vos propres frames';
          toast({
            title: '🔐 Erreur de permissions',
            description: errorMsg,
            variant: 'destructive'
          });
          console.error('❌ [RLS ERROR] Policy violation', {
            frameId,
            userId: session.user.id,
            error: updateError
          });
          return null;
        }
        
        console.error('❌ [DB ERROR]', updateError);
        throw updateError;
      }
      
      console.log('✅ [DB SUCCESS] Frame mise à jour');

      toast({
        title: '✅ Texte généré',
        description: `Frame ${frameType.toUpperCase()} : ${promotionalText.substring(0, 40)}...`
      });

      console.log('✅ [SUCCESS] generateFrameText', { 
        ...logContext, 
        textLength: promotionalText.length,
        wordCount: promotionalText.split(/\s+/).length
      });
      
      return promotionalText;
    } catch (error) {
      console.error('❌ [ERROR] generateFrameText', { ...logContext, error });
      
      toast({
        title: '❌ Erreur de génération',
        description: error instanceof Error ? error.message : 'Erreur inconnue',
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
    setIsGenerating(true);
    
    const results = await Promise.all(
      frames.map(frame => 
        generateFrameText(frame.id, frame.frame_type, frame.prompt, style, africaContext)
      )
    );
    
    setIsGenerating(false);
    
    const allSuccess = results.every(r => r !== null);
    
    if (allSuccess) {
      toast({
        title: '🎉 Génération terminée',
        description: 'Tous les textes promotionnels sont prêts!'
      });
    }

    return allSuccess;
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

      const isAvailable = await checkFunctionAvailability();

      let promotionalSummary: string;

      if (useFallback || !isAvailable) {
        // Mode fallback : combiner les textes
        promotionalSummary = `${heroText} ${demoText} ${resultText} ${ctaText}`;
      } else {
        const { data, error } = await supabase.functions.invoke('generate-promotional-texts', {
          body: { 
            action: 'generate-video-summary',
            heroText, 
            demoText, 
            resultText, 
            ctaText, 
            duration 
          }
        });

        if (error) throw error;
        if (!data?.promotionalSummary) throw new Error('No summary generated');

        promotionalSummary = data.promotionalSummary;
      }

      // Sauvegarder en base de données
      const { error: updateError } = await supabase
        .from('generated_videos')
        .update({
          promotional_summary: promotionalSummary,
          promotional_summary_generated_at: new Date().toISOString()
        })
        .eq('video_id', videoId);

      if (updateError) throw updateError;

      toast({
        title: '✅ Résumé créé',
        description: 'Résumé promotionnel vidéo généré avec succès'
      });

      return promotionalSummary;
    } catch (error) {
      console.error('Error generating video summary:', error);
      toast({
        title: '❌ Erreur',
        description: error instanceof Error ? error.message : 'Erreur inconnue',
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
    isGenerating,
    useFallback,
    checkFunctionAvailability
  };
};
