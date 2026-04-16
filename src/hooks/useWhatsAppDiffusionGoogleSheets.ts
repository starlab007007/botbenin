import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { queueGoogleSheetsOperation } from '@/services/googleSheetsQueue';

export interface WhatsAppDiffusionRow {
  id: string;
  user_id: string;
  id_campagne?: string;
  nom_campagne?: string;
  nom_contact?: string;
  contact_whatsapp?: string;
  statut?: string;
  [key: string]: any;
}

const DEFAULT_SPREADSHEET_ID = '1cXuo8Kot_ypgMaCoChjuf4ah4C2XlOMFyJLAjQ-lo1k';
const DEFAULT_SHEET_NAME = 'Sheet1';

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

export const useWhatsAppDiffusionGoogleSheets = (userId?: string) => {
  const [data, setData] = useState<WhatsAppDiffusionRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isWriting, setIsWriting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const { toast } = useToast();

  const isUserValid = !!userId && userId !== 'unknown' && userId.trim() !== '';

  const loadSheet = useCallback(async (): Promise<WhatsAppDiffusionRow[]> => {
    if (!isUserValid) return [];
    setIsLoading(true);
    setConnectionStatus('connecting');
    try {
      const { data: result, error } = await supabase.functions.invoke('google-sheets-reader', {
        body: { spreadsheetId: DEFAULT_SPREADSHEET_ID, sheetName: DEFAULT_SHEET_NAME }
      });
      if (error) throw new Error(error.message);
      if (result?.error) throw new Error(result.suggestion || result.details || result.error);

      let rows: WhatsAppDiffusionRow[] = [];
      if (result?.data && Array.isArray(result.data)) {
        rows = result.data
          .map((item: any) => normalizeRowKeys(item))
          .filter((item: any) => item.user_id === userId)
          .map((item: any) => ({
            ...item,
            id: item.id || `row_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            user_id: item.user_id || userId
          }));
      }
      setData(rows);
      setConnectionStatus('connected');
      setLastSync(new Date());
      return rows;
    } catch (err) {
      console.error('❌ Erreur chargement Diffusion WhatsApp:', err);
      setConnectionStatus('error');
      toast({ title: '❌ Erreur', description: 'Impossible de charger les contacts', variant: 'destructive' });
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [isUserValid, userId, toast]);

  const addRow = useCallback(async (row: Record<string, any>) => {
    if (!isUserValid || isWriting) return false;
    setIsWriting(true);
    try {
      const newRow: WhatsAppDiffusionRow = {
        ...row,
        id: `row_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        user_id: userId!
      };
      const result = await queueGoogleSheetsOperation(async () => {
        const { data: res, error } = await supabase.functions.invoke('google-sheets-writer', {
          body: {
            spreadsheetId: DEFAULT_SPREADSHEET_ID,
            sheetName: DEFAULT_SHEET_NAME,
            data: [newRow],
            operation: 'append',
            userId
          }
        });
        if (error) throw new Error(error.message);
        return res;
      });
      if (result?.success) {
        toast({ title: '✅ Ajouté', description: 'Contact ajouté avec succès' });
        await loadSheet();
        return true;
      }
      return false;
    } catch (err) {
      toast({ title: '❌ Erreur', description: err instanceof Error ? err.message : 'Erreur inconnue', variant: 'destructive' });
      return false;
    } finally {
      setIsWriting(false);
    }
  }, [isUserValid, isWriting, userId, loadSheet, toast]);

  const updateRow = useCallback(async (rowId: string, updatedFields: Record<string, any>) => {
    if (!isUserValid || isWriting) return false;
    setIsWriting(true);
    try {
      const result = await queueGoogleSheetsOperation(async () => {
        const { data: res, error } = await supabase.functions.invoke('google-sheets-writer', {
          body: {
            spreadsheetId: DEFAULT_SPREADSHEET_ID,
            sheetName: DEFAULT_SHEET_NAME,
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
        setData(prev => prev.map(r => (r.id === rowId ? { ...r, ...updatedFields } : r)));
        toast({ title: '✅ Mis à jour', description: 'Contact mis à jour' });
        return true;
      }
      return false;
    } catch (err) {
      toast({ title: '❌ Erreur', description: err instanceof Error ? err.message : 'Erreur', variant: 'destructive' });
      return false;
    } finally {
      setIsWriting(false);
    }
  }, [isUserValid, isWriting, userId, toast]);

  const deleteRow = useCallback(async (rowId: string) => {
    if (!isUserValid) return false;
    setIsWriting(true);
    try {
      const result = await queueGoogleSheetsOperation(async () => {
        const { data: res, error } = await supabase.functions.invoke('google-sheets-writer', {
          body: {
            spreadsheetId: DEFAULT_SPREADSHEET_ID,
            sheetName: DEFAULT_SHEET_NAME,
            operation: 'delete_by_id',
            prospectId: rowId,
            userId
          }
        });
        if (error) throw new Error(error.message);
        return res;
      });
      if (result?.success) {
        setData(prev => prev.filter(r => r.id !== rowId));
        toast({ title: '✅ Supprimé', description: 'Contact supprimé' });
        return true;
      }
      return false;
    } catch (err) {
      toast({ title: '❌ Erreur', description: err instanceof Error ? err.message : 'Erreur', variant: 'destructive' });
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
    loadSheet,
    addRow,
    updateRow,
    deleteRow,
    spreadsheetId: DEFAULT_SPREADSHEET_ID,
  };
};
