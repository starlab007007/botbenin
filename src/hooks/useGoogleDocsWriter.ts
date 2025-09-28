import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface GoogleDocsWriterHook {
  isWriting: boolean;
  writeToGoogleDoc: (docId: string, content: string) => Promise<boolean>;
  lastWriteTime: Date | null;
}

export const useGoogleDocsWriter = (userId?: string): GoogleDocsWriterHook => {
  const [isWriting, setIsWriting] = useState(false);
  const [lastWriteTime, setLastWriteTime] = useState<Date | null>(null);
  const { toast } = useToast();

  const writeToGoogleDoc = async (docId: string, content: string): Promise<boolean> => {
    if (!userId || !docId || !content) {
      console.error('Paramètres manquants pour l\'écriture Google Doc');
      return false;
    }

    setIsWriting(true);
    
    try {
      console.log('🔄 Écriture dans Google Doc:', { docId, contentLength: content.length, userId });
      
      const { data: result, error } = await supabase.functions.invoke('google-docs-writer', {
        body: {
          docId,
          content,
          userId
        }
      });

      if (error) {
        console.error('Erreur lors de l\'écriture dans Google Doc:', error);
        toast({
          title: "Erreur de synchronisation",
          description: `Impossible d'écrire dans le Google Doc: ${error.message}`,
          variant: "destructive"
        });
        return false;
      }

      if (result?.success) {
        console.log('✅ Écriture Google Doc réussie:', result);
        setLastWriteTime(new Date());
        
        toast({
          title: "✅ Synchronisation Google Docs réussie",
          description: `Document mis à jour avec succès (${content.length} caractères)`,
          duration: 4000
        });
        
        return true;
      } else {
        console.error('Réponse inattendue de google-docs-writer:', result);
        return false;
      }

    } catch (error: any) {
      console.error('Exception lors de l\'écriture Google Doc:', error);
      toast({
        title: "Erreur de synchronisation",
        description: `Erreur lors de l'écriture: ${error?.message || 'Erreur inconnue'}`,
        variant: "destructive"
      });
      return false;
      
    } finally {
      setIsWriting(false);
    }
  };

  return {
    isWriting,
    writeToGoogleDoc,
    lastWriteTime
  };
};