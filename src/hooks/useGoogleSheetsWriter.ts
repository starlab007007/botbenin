import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { queueGoogleSheetsOperation } from '@/services/googleSheetsQueue';

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
    operation: 'append' | 'overwrite' = 'append'
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

    // DÉDUPLICATION avant écriture - éviter les doublons dans Google Sheets
    const deduplicatedData = userOnlyData.reduce((acc, current) => {
      const existingIndex = acc.findIndex(item => 
        item.id === current.id || 
        (current.contact_name && current.company_name && current.user_id &&
         item.contact_name === current.contact_name && 
         item.company_name === current.company_name && 
         item.user_id === current.user_id)
      );
      
      if (existingIndex === -1) {
        acc.push(current);
      } else {
        // Garder la version la plus récente/complète
        acc[existingIndex] = { ...acc[existingIndex], ...current };
      }
      
      return acc;
    }, [] as ProspectDataWithUser[]);

    console.log(`🔄 Déduplication: ${userOnlyData.length} → ${deduplicatedData.length} prospects`);

    setIsWriting(true);

    try {
      // Ensure all data has user_id and belongs to current user ONLY
      const dataWithUserId = deduplicatedData.map(item => ({
        ...item,
        user_id: userId, // Force correct user_id for security
        id: item.id || `user_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }));

      console.log('🔄 Ajout à la queue Google Sheets:', { config, dataLength: deduplicatedData.length, operation });

      // Utiliser la queue pour sérialiser les opérations et éviter les conflits
      const result = await queueGoogleSheetsOperation(async () => {
        console.log('🔄 Exécution de l\'opération Google Sheets');
        
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
          throw new Error(error.message || 'Erreur Supabase function');
        }

        return result;
      });

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
          description: result.message || `${deduplicatedData.length} prospects synchronisés`,
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