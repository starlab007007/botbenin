import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

interface ProspectDataWithUser {
  id: string;
  user_id: string;
  [key: string]: any; // Dynamic fields from Google Sheet
}

interface GoogleSheetsConfig {
  spreadsheetId: string;
  sheetName: string;
}

export const useGoogleSheetsWriter = (userId?: string) => {
  const [isWriting, setIsWriting] = useState(false);
  const [lastWriteTime, setLastWriteTime] = useState<Date | null>(null);
  const { toast } = useToast();

  const writeToGoogleSheets = useCallback(async (
    config: GoogleSheetsConfig,
    data: ProspectDataWithUser[],
    operation: 'append' | 'overwrite' = 'overwrite'
  ) => {
    if (!config.spreadsheetId) {
      toast({
        title: "❌ Configuration manquante",
        description: "L'ID du Google Sheet est requis",
        variant: "destructive",
      });
      return false;
    }

    if (!data || data.length === 0) {
      toast({
        title: "❌ Aucune donnée",
        description: "Aucun prospect à synchroniser",
        variant: "destructive",
      });
      return false;
    }

    setIsWriting(true);

    try {
      console.log('🔄 Écriture vers Google Sheets:', { config, dataLength: data.length, operation });

      // Ensure all data has user_id
      const dataWithUserId = data.map(item => ({
        ...item,
        user_id: item.user_id || userId || 'unknown'
      }));

      const { data: result, error } = await supabase.functions.invoke('google-sheets-writer', {
        body: {
          spreadsheetId: config.spreadsheetId,
          sheetName: config.sheetName || 'Feuille 1',
          data: dataWithUserId,
          operation: operation,
          userId: userId
        }
      });

      if (error) {
        console.error('❌ Erreur Supabase function:', error);
        toast({
          title: "❌ Erreur de synchronisation",
          description: error.message,
          variant: "destructive",
        });
        return false;
      }

      if (result?.error) {
        console.error('❌ Erreur function result:', result.error);
        toast({
          title: "❌ Erreur Google Sheets",
          description: result.details || result.error,
          variant: "destructive",
        });
        return false;
      }

      if (result?.success) {
        setLastWriteTime(new Date());
        toast({
          title: "✅ Synchronisation réussie",
          description: result.message || `${data.length} prospects synchronisés`,
          duration: 3000,
        });
        console.log('✅ Données écrites avec succès:', result);
        return true;
      } else {
        toast({
          title: "⚠️ Réponse inattendue",
          description: "La synchronisation a peut-être réussi partiellement",
          variant: "default",
        });
        return false;
      }
    } catch (error) {
      console.error('❌ Exception lors de l\'écriture:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      toast({
        title: "❌ Erreur technique",
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    } finally {
      setIsWriting(false);
    }
  }, [toast]);

  const appendToGoogleSheets = useCallback(async (
    config: GoogleSheetsConfig,
    data: ProspectDataWithUser[]
  ) => {
    return writeToGoogleSheets(config, data, 'append');
  }, [writeToGoogleSheets]);

  const syncToGoogleSheets = useCallback(async (
    config: GoogleSheetsConfig,
    data: ProspectDataWithUser[]
  ) => {
    return writeToGoogleSheets(config, data, 'overwrite');
  }, [writeToGoogleSheets]);

  return {
    isWriting,
    lastWriteTime,
    writeToGoogleSheets,
    appendToGoogleSheets,
    syncToGoogleSheets
  };
};