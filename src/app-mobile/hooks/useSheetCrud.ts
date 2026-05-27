import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { queueGoogleSheetsOperation } from '@/services/googleSheetsQueue';
import { toast } from 'sonner';

export interface SheetRow {
  id: string;
  user_id: string;
  [k: string]: any;
}

const normalizeHeaderKey = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();

const normalizeRowKeys = (row: Record<string, any>): Record<string, any> => {
  const out: Record<string, any> = { ...row };
  Object.entries(row).forEach(([k, v]) => {
    const nk = normalizeHeaderKey(k);
    if (nk && !(nk in out)) out[nk] = v;
  });
  return out;
};

/**
 * Generic native hook for reading + writing a single Google Sheet tab,
 * scoped to a userId. Used by all Knowledge Base sectors (restaurant,
 * ecommerce, whatsapp_diffusion, etc.) for full CRUD synced with the sheet.
 */
export function useSheetCrud(
  spreadsheetId: string | undefined,
  sheetName: string | null,
  userId: string | undefined
) {
  const [rows, setRows] = useState<SheetRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isWriting, setIsWriting] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [authUserId, setAuthUserId] = useState<string | undefined>();
  const [authReady, setAuthReady] = useState(false);
  const writingRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setAuthUserId(data.user?.id);
    }).finally(() => {
      if (mounted) setAuthReady(true);
    });
    return () => { mounted = false; };
  }, []);

  const effectiveUserId = authUserId || (authReady ? userId : undefined);
  const isValid = !!spreadsheetId && !!sheetName && !!effectiveUserId;

  const load = useCallback(async () => {
    if (!isValid) return [] as SheetRow[];
    setIsLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('google-sheets-reader', {
        body: { spreadsheetId, sheetName }
      });
      if (error) throw new Error(error.message);
      if (result?.error) throw new Error(result.suggestion || result.details || result.error);
      const list: SheetRow[] = Array.isArray(result?.data)
        ? result.data
            .map((it: any) => normalizeRowKeys(it))
            .filter((it: any) => !it._isOrphan)
            .filter((it: any) => !it.user_id || String(it.user_id || '').trim() === String(effectiveUserId))
            .map((it: any) => ({
              ...it,
              id: String(it.id || `row_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`),
              user_id: String(it.user_id || effectiveUserId),
            }))
            .filter((it: any) => !!it.id)
        : [];
      setRows(list);
      setLastSync(new Date());
      return list;
    } catch (err) {
      console.error('useSheetCrud load error', err);
      toast.error('Impossible de charger les données', {
        description: err instanceof Error ? err.message : 'Erreur inconnue'
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [isValid, spreadsheetId, sheetName, effectiveUserId]);

  useEffect(() => {
    if (isValid) load();
  }, [isValid, load]);

  const addRow = useCallback(async (row: Record<string, any>) => {
    if (!isValid || writingRef.current) return false;
    writingRef.current = true;
    setIsWriting(true);
    try {
      const newRow = {
        ...row,
        id: `row_${effectiveUserId}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        user_id: effectiveUserId!,
      };
      const result = await queueGoogleSheetsOperation(async () => {
        const { data: res, error } = await supabase.functions.invoke('google-sheets-writer', {
          body: { spreadsheetId, sheetName, data: [newRow], operation: 'append', userId: effectiveUserId }
        });
        if (error) throw new Error(error.message);
        if (res?.error) throw new Error(res.details || res.error);
        return res;
      });
      if (result?.success) {
        toast.success('Ajouté');
        await load();
        return true;
      }
      return false;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur ajout');
      return false;
    } finally {
      writingRef.current = false;
      setIsWriting(false);
    }
  }, [isValid, spreadsheetId, sheetName, effectiveUserId, load]);

  const updateRow = useCallback(async (rowId: string, fields: Record<string, any>) => {
    if (!isValid || writingRef.current) return false;
    writingRef.current = true;
    setIsWriting(true);
    setRows(prev => prev.map(r => (r.id === rowId ? { ...r, ...fields } : r)));
    try {
      const result = await queueGoogleSheetsOperation(async () => {
        const { data: res, error } = await supabase.functions.invoke('google-sheets-writer', {
          body: {
            spreadsheetId, sheetName,
            operation: 'update_row',
            prospectId: rowId,
            rowData: { ...fields, user_id: effectiveUserId },
            userId: effectiveUserId
          }
        });
        if (error) throw new Error(error.message);
        if (res?.error) throw new Error(res.details || res.error);
        return res;
      });
      if (result?.success) {
        toast.success('Mis à jour');
        setTimeout(() => { load(); }, 1200);
        return true;
      }
      await load();
      return false;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur mise à jour');
      await load();
      return false;
    } finally {
      writingRef.current = false;
      setIsWriting(false);
    }
  }, [isValid, spreadsheetId, sheetName, effectiveUserId, load]);

  const deleteRow = useCallback(async (rowId: string) => {
    if (!isValid) return false;
    setIsWriting(true);
    try {
      const result = await queueGoogleSheetsOperation(async () => {
        const { data: res, error } = await supabase.functions.invoke('google-sheets-writer', {
          body: {
            spreadsheetId, sheetName,
            operation: 'delete_by_id',
            prospectId: rowId,
            userId: effectiveUserId
          }
        });
        if (error) throw new Error(error.message);
        if (res?.error) throw new Error(res.details || res.error);
        return res;
      });
      if (result?.success) {
        setRows(prev => prev.filter(r => r.id !== rowId));
        toast.success('Supprimé');
        setTimeout(() => { load(); }, 1200);
        return true;
      }
      return false;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur suppression');
      return false;
    } finally {
      setIsWriting(false);
    }
  }, [isValid, spreadsheetId, sheetName, effectiveUserId, load]);

  return { rows, isLoading, isWriting, lastSync, load, addRow, updateRow, deleteRow };
}
