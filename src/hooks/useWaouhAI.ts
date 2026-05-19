import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type WaouhAIAction =
  | 'enrich_business'
  | 'suggest_products'
  | 'parse_product_free_text'
  | 'parse_voice_business'
  | 'reverse_geocode'
  | 'geocode_address'
  | 'clean_catalog_entry';

export function useWaouhAI() {
  const { toast } = useToast();
  const [loading, setLoading] = useState<WaouhAIAction | null>(null);

  const run = async <T = any>(action: WaouhAIAction, payload: any): Promise<T | null> => {
    setLoading(action);
    try {
      const { data, error } = await supabase.functions.invoke('waouh-partner-ai', {
        body: { action, payload },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return (data as any).data as T;
    } catch (e: any) {
      const msg = e?.message || 'Erreur IA';
      if (msg.includes('429')) toast({ title: 'Trop de requêtes', description: 'Patientez quelques secondes.', variant: 'destructive' });
      else if (msg.includes('402')) toast({ title: 'Crédits épuisés', description: 'Ajoutez des crédits dans votre espace Lovable.', variant: 'destructive' });
      else toast({ title: 'Erreur IA', description: msg, variant: 'destructive' });
      return null;
    } finally {
      setLoading(null);
    }
  };

  return { run, loading };
}
