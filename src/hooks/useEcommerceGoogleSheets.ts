import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { queueGoogleSheetsOperation } from '@/services/googleSheetsQueue';

export interface EcommerceSheetRow {
  id: string;
  user_id: string;
  [key: string]: any;
}

interface SheetConfig {
  spreadsheetId: string;
  sheetName: string;
}

const DEFAULT_SPREADSHEET_ID = '1uL2NymfNiZf57MI2b6nRcs2dVtCoiJ9rI-P3Qok2v40';

export const useEcommerceGoogleSheets = (userId?: string) => {
  const [data, setData] = useState<Record<string, EcommerceSheetRow[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isWriting, setIsWriting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const { toast } = useToast();

  const isUserValid = userId && userId !== 'unknown' && userId.trim() !== '';

  const loadSheet = useCallback(async (sheetName: string, showNotification = false): Promise<EcommerceSheetRow[]> => {
    if (!isUserValid) return [];

    try {
      const { data: result, error } = await supabase.functions.invoke('google-sheets-reader', {
        body: { spreadsheetId: DEFAULT_SPREADSHEET_ID, sheetName }
      });

      if (error) throw new Error(error.message);
      if (result?.error) throw new Error(result.details || result.error);

      if (result?.data && Array.isArray(result.data)) {
        // Filter by user_id for data isolation
        const userRows = result.data
          .filter((item: any) => item.user_id === userId || !item.user_id || item.user_id === '')
          .map((item: any) => ({
            ...item,
            id: item.id || `row_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            user_id: item.user_id || userId
          }));
        return userRows;
      }
      return [];
    } catch (err) {
      console.error(`❌ Erreur chargement feuille ${sheetName}:`, err);
      return [];
    }
  }, [isUserValid, userId]);

  const loadAllSheets = useCallback(async (sheetNames: string[] = ['Produits', 'Commandes', 'Promotions', 'Infos_Boutique', 'Clients']) => {
    if (!isUserValid) {
      toast({ title: "❌ Accès refusé", description: "Vous devez être connecté", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setConnectionStatus('connecting');

    try {
      const results: Record<string, EcommerceSheetRow[]> = {};
      for (const sheetName of sheetNames) {
        results[sheetName] = await loadSheet(sheetName);
      }
      setData(results);
      setConnectionStatus('connected');
      setLastSync(new Date());
      toast({ title: "✅ Données chargées", description: `${sheetNames.length} feuilles synchronisées` });
    } catch (err) {
      setConnectionStatus('error');
      toast({ title: "❌ Erreur", description: "Impossible de charger les données", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [isUserValid, userId, loadSheet, toast]);

  const writeToSheet = useCallback(async (
    sheetName: string,
    rows: EcommerceSheetRow[],
    operation: 'append' | 'overwrite' = 'overwrite'
  ) => {
    if (!isUserValid || isWriting) return false;

    setIsWriting(true);
    try {
      const dataWithUser = rows.map(row => ({ ...row, user_id: userId! }));

      const result = await queueGoogleSheetsOperation(async () => {
        const { data: res, error } = await supabase.functions.invoke('google-sheets-writer', {
          body: {
            spreadsheetId: DEFAULT_SPREADSHEET_ID,
            sheetName,
            data: dataWithUser,
            operation,
            userId
          }
        });
        if (error) throw new Error(error.message);
        return res;
      });

      if (result?.success) {
        toast({ title: "✅ Synchronisation réussie", description: `Feuille "${sheetName}" mise à jour` });
        // Refresh the sheet data
        const updated = await loadSheet(sheetName);
        setData(prev => ({ ...prev, [sheetName]: updated }));
        return true;
      }
      return false;
    } catch (err) {
      toast({ title: "❌ Erreur", description: err instanceof Error ? err.message : 'Erreur inconnue', variant: "destructive" });
      return false;
    } finally {
      setIsWriting(false);
    }
  }, [isUserValid, isWriting, userId, loadSheet, toast]);

  const addRow = useCallback(async (sheetName: string, row: Record<string, any>) => {
    const newRow: EcommerceSheetRow = {
      ...row,
      id: `row_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user_id: userId!
    };
    const currentRows = data[sheetName] || [];
    return writeToSheet(sheetName, [...currentRows, newRow], 'overwrite');
  }, [data, userId, writeToSheet]);

  const updateRow = useCallback(async (sheetName: string, rowId: string, updatedFields: Record<string, any>) => {
    const currentRows = data[sheetName] || [];
    const updatedRows = currentRows.map(row =>
      row.id === rowId ? { ...row, ...updatedFields } : row
    );
    return writeToSheet(sheetName, updatedRows, 'overwrite');
  }, [data, writeToSheet]);

  const deleteRow = useCallback(async (sheetName: string, rowId: string) => {
    if (!isUserValid) return false;

    setIsWriting(true);
    try {
      const result = await queueGoogleSheetsOperation(async () => {
        const { data: res, error } = await supabase.functions.invoke('google-sheets-writer', {
          body: {
            spreadsheetId: DEFAULT_SPREADSHEET_ID,
            sheetName,
            operation: 'delete_by_id',
            prospectId: rowId,
            userId
          }
        });
        if (error) throw new Error(error.message);
        return res;
      });

      if (result?.success) {
        setData(prev => ({
          ...prev,
          [sheetName]: (prev[sheetName] || []).filter(r => r.id !== rowId)
        }));
        toast({ title: "✅ Supprimé", description: "Ligne supprimée avec succès" });
        return true;
      }
      return false;
    } catch (err) {
      toast({ title: "❌ Erreur", description: err instanceof Error ? err.message : 'Erreur', variant: "destructive" });
      return false;
    } finally {
      setIsWriting(false);
    }
  }, [isUserValid, userId, toast]);

  const updateField = useCallback(async (sheetName: string, rowId: string, fieldName: string, fieldValue: string) => {
    if (!isUserValid) return false;

    setIsWriting(true);
    try {
      const result = await queueGoogleSheetsOperation(async () => {
        const { data: res, error } = await supabase.functions.invoke('google-sheets-writer', {
          body: {
            spreadsheetId: DEFAULT_SPREADSHEET_ID,
            sheetName,
            operation: 'update_field',
            prospectId: rowId,
            fieldName,
            fieldValue,
            userId
          }
        });
        if (error) throw new Error(error.message);
        return res;
      });

      if (result?.success) {
        setData(prev => ({
          ...prev,
          [sheetName]: (prev[sheetName] || []).map(r =>
            r.id === rowId ? { ...r, [fieldName]: fieldValue } : r
          )
        }));
        return true;
      }
      return false;
    } catch (err) {
      toast({ title: "❌ Erreur", description: err instanceof Error ? err.message : 'Erreur', variant: "destructive" });
      return false;
    } finally {
      setIsWriting(false);
    }
  }, [isUserValid, userId, toast]);

  return {
    data,
    isLoading,
    isWriting,
    connectionStatus,
    lastSync,
    loadAllSheets,
    loadSheet,
    writeToSheet,
    addRow,
    updateRow,
    deleteRow,
    updateField,
    spreadsheetId: DEFAULT_SPREADSHEET_ID
  };
};
