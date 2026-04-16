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
// Try multiple sheet names (Google Sheets default is "Feuille 1" in French, "Sheet1" in English)
const SHEET_NAME_CANDIDATES = [
  'Diffusion Whatsapp',
  'Diffusion WhatsApp',
  'Contacts',
  'Feuille 1',
  'Feuil1',
  'Feuille1',
  'Sheet1',
];

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
  // Map "STATUT(Actif/Inactif)" → "statut" alias
  if (!normalized.statut && normalized.statut_actif_inactif) {
    normalized.statut = normalized.statut_actif_inactif;
  }
  return normalized;
};

// Only these fields are editable from the front. We never send business columns
// like STATUT_ENVOI / DATE_ENVOI / ERREUR / TOTAL_CONTACT_TRAITE so they remain intact.
const buildEditablePayload = (row: Record<string, any>) => ({
  id_campagne: row.id_campagne ?? '',
  nom_campagne: row.nom_campagne ?? '',
  nom_contact: row.nom_contact ?? '',
  contact_whatsapp: row.contact_whatsapp ?? '',
  statut: row.statut ?? 'Actif',
});

export const useWhatsAppDiffusionGoogleSheets = (userId?: string) => {
  const [data, setData] = useState<WhatsAppDiffusionRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isWriting, setIsWriting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [activeSheetName, setActiveSheetName] = useState<string>('Diffusion Whatsapp');
  const { toast } = useToast();

  const isUserValid = !!userId && userId !== 'unknown' && userId.trim() !== '';

  const tryLoadFromSheet = async (sheetName: string) => {
    const { data: result, error } = await supabase.functions.invoke('google-sheets-reader', {
      body: { spreadsheetId: DEFAULT_SPREADSHEET_ID, sheetName }
    });
    if (error) throw new Error(error.message);
    if (result?.error) throw new Error(result.suggestion || result.details || result.error);
    return result;
  };

  const loadSheet = useCallback(async (): Promise<WhatsAppDiffusionRow[]> => {
    if (!isUserValid) return [];
    setIsLoading(true);
    setConnectionStatus('connecting');
    try {
      let result: any = null;
      let usedSheetName = activeSheetName;

      // Try the active sheet first, then fallbacks
      const candidates = [activeSheetName, ...SHEET_NAME_CANDIDATES.filter(n => n !== activeSheetName)];
      for (const name of candidates) {
        try {
          const r = await tryLoadFromSheet(name);
          if (r && Array.isArray(r.data)) {
            result = r;
            usedSheetName = name;
            break;
          }
        } catch (e) {
          console.log(`⚠️ Sheet "${name}" not accessible, trying next...`);
        }
      }

      if (!result) throw new Error('Aucune feuille accessible dans le Google Sheet');
      setActiveSheetName(usedSheetName);

      let rows: WhatsAppDiffusionRow[] = [];
      if (result?.data && Array.isArray(result.data)) {
        rows = result.data
          .map((item: any) => normalizeRowKeys(item))
          // STRICT user isolation:
          // - Reject orphan rows (reader marks them with _isOrphan = true) so users
          //   never see legacy rows that don't belong to them.
          // - Only show rows where the SHEET's user_id EXACTLY matches the auth user.
          .filter((item: any) => {
            if (item._isOrphan === true) return false;
            return String(item.user_id || '').trim() === userId;
          })
          .map((item: any) => ({
            ...item,
            // CRITICAL: keep the id provided by the reader (gs_<ts>_<idx> or real id).
            // Regenerating it would break update/delete operations.
            id: String(item.id || ''),
            user_id: userId!,
          }))
          .filter((item: any) => !!item.id);
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
  }, [isUserValid, userId, toast, activeSheetName]);

  const addRow = useCallback(async (row: Record<string, any>) => {
    if (!isUserValid || isWriting) return false;
    setIsWriting(true);
    try {
      const editable = buildEditablePayload(row);
      const newRow = {
        ...editable,
        id: `row_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        user_id: userId!,
      };
      const result = await queueGoogleSheetsOperation(async () => {
        const { data: res, error } = await supabase.functions.invoke('google-sheets-writer', {
          body: {
            spreadsheetId: DEFAULT_SPREADSHEET_ID,
            sheetName: activeSheetName,
            data: [newRow],
            operation: 'append',
            userId
          }
        });
        if (error) throw new Error(error.message);
        if (res?.error) throw new Error(res.details || res.error);
        return res;
      });
      if (result?.success) {
        toast({ title: '✅ Ajouté', description: 'Contact ajouté avec succès' });
        await loadSheet();
        return true;
      }
      return false;
    } catch (err) {
      console.error('❌ addRow error:', err);
      toast({ title: '❌ Erreur', description: err instanceof Error ? err.message : 'Erreur inconnue', variant: 'destructive' });
      return false;
    } finally {
      setIsWriting(false);
    }
  }, [isUserValid, isWriting, userId, loadSheet, toast, activeSheetName]);

  const updateRow = useCallback(async (rowId: string, updatedFields: Record<string, any>) => {
    if (!isUserValid || isWriting) return false;
    setIsWriting(true);
    try {
      // Optimistic UI update
      setData(prev => prev.map(r => (r.id === rowId ? { ...r, ...updatedFields } : r)));

      // Send only editable fields so business columns (STATUT_ENVOI, DATE_ENVOI, …)
      // are never overwritten by the writer.
      const editable = buildEditablePayload({
        ...(data.find(r => r.id === rowId) || {}),
        ...updatedFields,
      });

      const result = await queueGoogleSheetsOperation(async () => {
        const { data: res, error } = await supabase.functions.invoke('google-sheets-writer', {
          body: {
            spreadsheetId: DEFAULT_SPREADSHEET_ID,
            sheetName: activeSheetName,
            operation: 'update_row',
            prospectId: rowId,
            rowData: { ...editable, user_id: userId },
            userId
          }
        });
        if (error) throw new Error(error.message);
        if (res?.error) throw new Error(res.details || res.error);
        return res;
      });
      if (result?.success) {
        toast({ title: '✅ Mis à jour', description: 'Contact mis à jour' });
        return true;
      }
      // Rollback on failure
      await loadSheet();
      return false;
    } catch (err) {
      console.error('❌ updateRow error:', err);
      toast({ title: '❌ Erreur', description: err instanceof Error ? err.message : 'Erreur', variant: 'destructive' });
      await loadSheet();
      return false;
    } finally {
      setIsWriting(false);
    }
  }, [isUserValid, isWriting, userId, toast, activeSheetName, loadSheet, data]);

  const deleteRow = useCallback(async (rowId: string) => {
    if (!isUserValid) return false;
    setIsWriting(true);
    try {
      const result = await queueGoogleSheetsOperation(async () => {
        const { data: res, error } = await supabase.functions.invoke('google-sheets-writer', {
          body: {
            spreadsheetId: DEFAULT_SPREADSHEET_ID,
            sheetName: activeSheetName,
            operation: 'delete_by_id',
            prospectId: rowId,
            userId
          }
        });
        if (error) throw new Error(error.message);
        if (res?.error) throw new Error(res.details || res.error);
        return res;
      });
      if (result?.success) {
        setData(prev => prev.filter(r => r.id !== rowId));
        toast({ title: '✅ Supprimé', description: 'Contact supprimé' });
        return true;
      }
      return false;
    } catch (err) {
      console.error('❌ deleteRow error:', err);
      toast({ title: '❌ Erreur', description: err instanceof Error ? err.message : 'Erreur', variant: 'destructive' });
      return false;
    } finally {
      setIsWriting(false);
    }
  }, [isUserValid, userId, toast, activeSheetName]);

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
    activeSheetName,
  };
};
