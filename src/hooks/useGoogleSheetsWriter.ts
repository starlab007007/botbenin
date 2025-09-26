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
    // Éviter les écritures multiples concurrentes
    if (isWriting) {
      console.log('Écriture déjà en cours, ignorée');
      toast({
        title: "⏳ Opération en cours",
        description: "Une synchronisation est déjà en cours, veuillez patienter",
        variant: "default",
      });
      return false;
    }

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

    // DÉDUPLICATION stricte avant écriture
    const deduplicatedData = userOnlyData.reduce((acc, current) => {
      const existingIndex = acc.findIndex(item => {
        // D'abord par ID exact
        if (item.id === current.id) return true;
        
        // Puis par critères métier si tous les champs nécessaires sont présents
        if (current.contact_name && current.company_name && current.user_id &&
            item.contact_name && item.company_name && item.user_id) {
          return item.contact_name.toLowerCase() === current.contact_name.toLowerCase() && 
                 item.company_name.toLowerCase() === current.company_name.toLowerCase() && 
                 item.user_id === current.user_id;
        }
        
        return false;
      });
      
      if (existingIndex === -1) {
        acc.push(current);
      } else {
        // Garder la version la plus récente/complète
        acc[existingIndex] = { ...acc[existingIndex], ...current };
      }
      
      return acc;
    }, [] as ProspectDataWithUser[]);

    console.log(`🔄 Déduplication: ${userOnlyData.length} → ${deduplicatedData.length} prospects`);

    if (deduplicatedData.length === 0) {
      toast({
        title: "❌ Aucune donnée unique",
        description: "Tous les prospects sont déjà présents",
        variant: "default",
      });
      return false;
    }

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
    // Cette fonction doit ajouter SEULEMENT les nouvelles données, pas toutes les existantes
    console.log('📝 Ajout de nouvelles données uniquement:', { count: data.length });
    return writeToGoogleSheets(config, data, 'append');
  }, [writeToGoogleSheets]);

  const syncToGoogleSheets = useCallback(async (
    config: GoogleSheetsConfig,
    data: ProspectDataWithUser[]
  ) => {
    return writeToGoogleSheets(config, data, 'overwrite');
  }, [writeToGoogleSheets]);

  // Fonction pour supprimer une ligne spécifique dans Google Sheets par critères métier
  const deleteFromGoogleSheets = useCallback(async (
    config: GoogleSheetsConfig, 
    prospectToDelete: { contact_name?: string; company_name?: string; user_id: string }
  ) => {
    const finalSpreadsheetId = config.spreadsheetId;
    
    if (!finalSpreadsheetId) {
      toast({
        title: "❌ Configuration manquante",
        description: "L'ID du Google Sheet est requis",
        variant: "destructive",
      });
      return false;
    }

    console.log('🗑️ Suppression spécifique par critères:', prospectToDelete);

    try {
      setIsWriting(true);
      
      const result = await queueGoogleSheetsOperation(async () => {
        const { data: result, error } = await supabase.functions.invoke('google-sheets-writer', {
          body: {
            spreadsheetId: finalSpreadsheetId,
            sheetName: config.sheetName || 'Feuille 1',
            operation: 'delete_specific', // Opération spécifique pour suppression par critères
            deleteData: prospectToDelete, // Critères de suppression
            userId: prospectToDelete.user_id
          }
        });

        if (error) {
          throw new Error(error.message || 'Erreur Supabase function');
        }

        return result;
      });

      if (result?.success) {
        toast({
          title: "✅ Suppression réussie",
          description: "Prospect supprimé de Google Sheets",
        });
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Erreur lors de la suppression:', error);
      return false;
    } finally {
      setIsWriting(false);
    }
  }, [toast]);

  return {
    isWriting,
    lastWriteTime,
    writeToGoogleSheets,
    appendToGoogleSheets,
    syncToGoogleSheets,
    deleteFromGoogleSheets
  };
};