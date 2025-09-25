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

  // Configuration par défaut pour tous les utilisateurs - SÉCURISÉE
  const defaultSpreadsheetId = '14EJzlOtGp3aGQciNLgqafi-yjz6Rc83bGXahWE5OIZ8';

  const writeToGoogleSheets = useCallback(async (
    config: GoogleSheetsConfig,
    data: ProspectDataWithUser[],
    operation: 'append' | 'overwrite' = 'append' // DEFAULT CHANGED TO APPEND
  ) => {
    // Utiliser le spreadsheet par défaut si aucun n'est spécifié
    const finalSpreadsheetId = config.spreadsheetId || defaultSpreadsheetId;
    
    if (!finalSpreadsheetId) {
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

    // SÉCURITÉ : Filtrer les données pour ne synchroniser que celles de l'utilisateur
    if (!userId || userId === 'unknown') {
      toast({
        title: "❌ Utilisateur non authentifié",
        description: "Vous devez être connecté pour synchroniser",
        variant: "destructive",
      });
      return false;
    }

    const userOnlyData = data.filter(item => item.user_id === userId);
    
    if (userOnlyData.length === 0) {
      toast({
        title: "❌ Aucune donnée personnelle",
        description: "Aucun prospect ne vous appartient",
        variant: "destructive",
      });
      return false;
    }

    setIsWriting(true);

    try {
      console.log('🔄 Écriture vers Google Sheets:', { config, dataLength: data.length, operation });

      // Ensure all data has user_id and belongs to current user ONLY
      const dataWithUserId = userOnlyData.map(item => ({
        ...item,
        user_id: userId // Force correct user_id for security
      }));

      const { data: result, error } = await supabase.functions.invoke('google-sheets-writer', {
        body: {
          spreadsheetId: finalSpreadsheetId,
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
          description: result.message || `${userOnlyData.length} prospects synchronisés`,
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