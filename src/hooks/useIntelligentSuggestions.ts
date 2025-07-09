import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface IntelligentSuggestion {
  suggestion_id: string;
  title: string;
  description: string;
  action_prompt: string;
  icon_name: string;
  category: string;
  domain_name: string;
  confidence_score: number;
}

export const useIntelligentSuggestions = (botId?: string, limit: number = 4) => {
  const [suggestions, setSuggestions] = useState<IntelligentSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchIntelligentSuggestions = async () => {
    if (!botId) return;

    try {
      setLoading(true);
      setError(null);

      // Appeler la fonction SQL pour obtenir les suggestions intelligentes
      const { data, error } = await supabase.rpc('get_intelligent_suggestions', {
        p_bot_id: botId,
        p_limit: limit
      });

      if (error) throw error;

      setSuggestions(data || []);
    } catch (err) {
      console.error('Erreur lors du chargement des suggestions intelligentes:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  const trackSuggestionClick = async (suggestionId: string) => {
    if (!botId) return;

    try {
      // Vérifier si une métrique existe déjà
      const { data: existing } = await supabase
        .from('suggestion_metrics')
        .select('clicked_count')
        .eq('suggestion_id', suggestionId)
        .eq('bot_id', botId)
        .single();

      if (existing) {
        // Mettre à jour le compteur existant
        await supabase
          .from('suggestion_metrics')
          .update({
            clicked_count: existing.clicked_count + 1,
            last_clicked: new Date().toISOString()
          })
          .eq('suggestion_id', suggestionId)
          .eq('bot_id', botId);
      } else {
        // Créer une nouvelle métrique
        await supabase
          .from('suggestion_metrics')
          .insert({
            suggestion_id: suggestionId,
            bot_id: botId,
            clicked_count: 1,
            last_clicked: new Date().toISOString()
          });
      }
    } catch (err) {
      console.error('Erreur lors du tracking:', err);
    }
  };

  useEffect(() => {
    fetchIntelligentSuggestions();
  }, [botId, limit]);

  return {
    suggestions,
    loading,
    error,
    refreshSuggestions: fetchIntelligentSuggestions,
    trackSuggestionClick
  };
};