import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { queueGoogleSheetsOperation } from '@/services/googleSheetsQueue';

export interface RestaurationSheetRow {
  id: string;
  user_id: string;
  [key: string]: any;
}

const DEFAULT_SPREADSHEET_ID = '1_vh93IuyO6VusOZEKYlj3TWpfLTpq4Yj231rwRwkcXM';

const normalizeHeaderKey = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();

const normalizeRowKeys = (row: Record<string, any>): Record<string, any> => {
  const normalized: Record<string, any> = { ...row };
  Object.entries(row).forEach(([key, value]) => {
    const normalizedKey = normalizeHeaderKey(key);
    if (!normalizedKey || normalizedKey in normalized) return;
    normalized[normalizedKey] = value;
  });
  return normalized;
};

export const useRestaurationGoogleSheets = (userId?: string) => {
  const [data, setData] = useState<Record<string, RestaurationSheetRow[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isWriting, setIsWriting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const { toast } = useToast();

  const isUserValid = userId && userId !== 'unknown' && userId.trim() !== '';

  const loadSheet = useCallback(async (sheetName: string): Promise<RestaurationSheetRow[]> => {
    if (!isUserValid) return [];
    try {
      const { data: result, error } = await supabase.functions.invoke('google-sheets-reader', {
        body: { spreadsheetId: DEFAULT_SPREADSHEET_ID, sheetName }
      });
      if (error) throw new Error(error.message);
      if (result?.error) throw new Error(result.suggestion || result.details || result.error);

      if (result?.data && Array.isArray(result.data)) {
        return result.data
          .map((item: any) => normalizeRowKeys(item))
          .filter((item: any) => item.user_id === userId)
          .map((item: any) => ({
            ...item,
            id: item.id || `row_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            user_id: item.user_id || userId
          }));
      }
      return [];
    } catch (err) {
      console.error(`❌ Erreur chargement feuille ${sheetName}:`, err);
      return [];
    }
  }, [isUserValid, userId]);

  const loadAllSheets = useCallback(async (sheetNames: string[] = ['Menu', 'Commandes', 'Clients', 'Reservations', 'Infos_Restaurant']) => {
    if (!isUserValid) {
      toast({ title: "❌ Accès refusé", description: "Vous devez être connecté", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setConnectionStatus('connecting');
    try {
      const results: Record<string, RestaurationSheetRow[]> = {};
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

  const writeToSheet = useCallback(async (sheetName: string, rows: RestaurationSheetRow[], operation: 'append' | 'overwrite' = 'overwrite') => {
    if (!isUserValid || isWriting) return false;
    setIsWriting(true);
    try {
      const dataWithUser = rows.map(row => ({ ...row, user_id: userId! }));
      const result = await queueGoogleSheetsOperation(async () => {
        const { data: res, error } = await supabase.functions.invoke('google-sheets-writer', {
          body: { spreadsheetId: DEFAULT_SPREADSHEET_ID, sheetName, data: dataWithUser, operation, userId }
        });
        if (error) throw new Error(error.message);
        return res;
      });
      if (result?.success) {
        toast({ title: "✅ Synchronisation réussie", description: `Feuille "${sheetName}" mise à jour` });
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
    const newRow: RestaurationSheetRow = {
      ...row,
      id: `row_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user_id: userId!
    };
    return writeToSheet(sheetName, [newRow], 'append');
  }, [userId, writeToSheet]);

  const updateRow = useCallback(async (sheetName: string, rowId: string, updatedFields: Record<string, any>) => {
    if (!isUserValid || isWriting) return false;
    setIsWriting(true);
    try {
      const result = await queueGoogleSheetsOperation(async () => {
        const { data: res, error } = await supabase.functions.invoke('google-sheets-writer', {
          body: {
            spreadsheetId: DEFAULT_SPREADSHEET_ID,
            sheetName,
            operation: 'update_row',
            prospectId: rowId,
            rowData: updatedFields,
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
            r.id === rowId ? { ...r, ...updatedFields } : r
          )
        }));
        toast({ title: "✅ Mis à jour", description: "Ligne mise à jour avec succès" });
        return true;
      }
      return false;
    } catch (err) {
      toast({ title: "❌ Erreur", description: err instanceof Error ? err.message : 'Erreur', variant: "destructive" });
      return false;
    } finally {
      setIsWriting(false);
    }
  }, [isUserValid, isWriting, userId, toast]);

  const deleteRow = useCallback(async (sheetName: string, rowId: string) => {
    if (!isUserValid) return false;
    setIsWriting(true);
    try {
      const result = await queueGoogleSheetsOperation(async () => {
        const { data: res, error } = await supabase.functions.invoke('google-sheets-writer', {
          body: { spreadsheetId: DEFAULT_SPREADSHEET_ID, sheetName, operation: 'delete_by_id', prospectId: rowId, userId }
        });
        if (error) throw new Error(error.message);
        return res;
      });
      if (result?.success) {
        setData(prev => ({ ...prev, [sheetName]: (prev[sheetName] || []).filter(r => r.id !== rowId) }));
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

  return {
    data, isLoading, isWriting, connectionStatus, lastSync,
    loadAllSheets, loadSheet, writeToSheet, addRow, updateRow, deleteRow,
    spreadsheetId: DEFAULT_SPREADSHEET_ID
  };
};
