import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import NativeFormScreen from '../../components/native/NativeFormScreen';
import NativeFieldRenderer from '../../components/bots/NativeFieldRenderer';
import { useKnowledgeBases } from '@/hooks/useKnowledgeBases';
import { useKnowledgeBaseTemplates } from '@/hooks/useKnowledgeBaseTemplates';
import { useSheetCrud } from '../../hooks/useSheetCrud';
import { getSheetNameForTable, isGoogleSheetTemplate } from '../../utils/sheetMapping';
import { toast } from 'sonner';

export default function NativeEntryFormScreen() {
  const { id, tableId, index } = useParams();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const { knowledgeBases, updateKnowledgeBase } = useKnowledgeBases();
  const { getTemplateById, calculateCompletion } = useKnowledgeBaseTemplates();

  const kb = knowledgeBases.find(k => k.id === id);
  const template = kb ? getTemplateById(kb.template_id) : undefined;
  const table = template?.tables.find(t => t.id === tableId);

  // Google Sheet mode detection: index starts with "gs:" (handles encoded ":" too) OR query gs=1
  const rawIndex = index ? decodeURIComponent(index) : '';
  const gsIdParam = rawIndex.startsWith('gs:') ? rawIndex.slice(3) : null;
  const isNew = !index || index === 'new';
  const isGsMode = !!(template && isGoogleSheetTemplate(template) && (gsIdParam || search.get('gs') === '1'));
  const isEdit = !isNew && (gsIdParam !== null || (index !== 'new' && index !== undefined));
  const editIdx = !isGsMode && isEdit ? parseInt(index!, 10) : -1;

  const sheetName = template && table && isGsMode ? getSheetNameForTable(template, table.id) : null;
  const sheet = useSheetCrud(template?.googleSheetConfig?.spreadsheetId, sheetName, kb?.user_id);

  const [form, setForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  // Preload existing entry
  useEffect(() => {
    if (!kb || !table) return;
    if (isGsMode && gsIdParam) {
      const existing = sheet.rows.find(r => String(r.id) === gsIdParam);
      if (existing) setForm({ ...existing });
    } else if (!isGsMode && isEdit) {
      const existing = (kb.data as any)[table.id]?.[editIdx];
      if (existing) setForm({ ...existing });
    }
  }, [kb, table, isEdit, editIdx, isGsMode, gsIdParam, sheet.rows]);

  if (!kb || !template || !table) {
    return <div className="min-h-[100dvh] flex items-center justify-center text-sm text-muted-foreground">Chargement…</div>;
  }

  const requiredOk = table.fields.filter(f => f.required).every(f => {
    const v = form[f.name];
    return v !== undefined && v !== null && String(v).trim() !== '';
  });

  const backToDetail = () => {
    if (kb) navigate(`/app/bots/${kb.id}`, { replace: true });
    else navigate(-1);
  };

  const save = async () => {
    setSaving(true);
    try {
      if (isGsMode) {
        const { id: _omit, user_id: _omit2, _isOrphan, ...payload } = form;
        const ok = isEdit
          ? await sheet.updateRow(gsIdParam!, payload)
          : await sheet.addRow(payload);
        if (ok) backToDetail();
      } else {
        const all = { ...((kb.data as any) || {}) };
        const list = [...(all[table.id] || [])];
        if (isEdit) list[editIdx] = form;
        else list.push(form);
        all[table.id] = list;
        const newCompletion = calculateCompletion(all, (kb.structural_info as any) || {}, template);
        const ok = await updateKnowledgeBase(kb.id, { data: all, completion_percentage: newCompletion });
        if (ok) {
          toast.success(isEdit ? 'Entrée modifiée' : 'Entrée ajoutée');
          backToDetail();
        }
      }
    } finally { setSaving(false); }
  };

  const del = async () => {
    if (!isEdit) return;
    setSaving(true);
    try {
      if (isGsMode) {
        const ok = await sheet.deleteRow(gsIdParam!);
        if (ok) backToDetail();
      } else {
        const all = { ...((kb.data as any) || {}) };
        const list = [...(all[table.id] || [])];
        list.splice(editIdx, 1);
        all[table.id] = list;
        const newCompletion = calculateCompletion(all, (kb.structural_info as any) || {}, template);
        const ok = await updateKnowledgeBase(kb.id, { data: all, completion_percentage: newCompletion });
        if (ok) { toast.success('Entrée supprimée'); backToDetail(); }
      }
    } finally { setSaving(false); }
  };

  return (
    <NativeFormScreen
      title={isEdit ? 'Modifier' : 'Ajouter'}
      subtitle={`${table.name}${isGsMode ? ' · Google Sheets' : ''}`}
      saving={saving || sheet.isWriting}
      canSubmit={requiredOk}
      submitLabel={isEdit ? 'Enregistrer' : 'Ajouter'}
      onSubmit={save}
    >
      {table.fields.map(f => (
        <div key={f.name} className="space-y-1.5">
          <label className="text-sm font-medium block">
            {(f as any).description || f.name}
            {f.required && <span className="text-destructive ml-1">*</span>}
          </label>
          <NativeFieldRenderer
            field={f as any}
            value={form[f.name]}
            onChange={(v) => setForm(prev => ({ ...prev, [f.name]: v }))}
          />
        </div>
      ))}
      {isEdit && (
        <button
          type="button"
          onClick={del}
          disabled={saving || sheet.isWriting}
          className="w-full h-11 mt-4 rounded-lg border border-destructive/40 text-destructive font-medium active:bg-destructive/5 disabled:opacity-50"
        >
          Supprimer cette entrée
        </button>
      )}
    </NativeFormScreen>
  );
}
