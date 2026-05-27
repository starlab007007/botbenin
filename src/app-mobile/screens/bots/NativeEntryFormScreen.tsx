import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import NativeFormScreen from '../../components/native/NativeFormScreen';
import NativeFieldRenderer from '../../components/bots/NativeFieldRenderer';
import { useKnowledgeBases } from '@/hooks/useKnowledgeBases';
import { useKnowledgeBaseTemplates } from '@/hooks/useKnowledgeBaseTemplates';
import { toast } from 'sonner';

export default function NativeEntryFormScreen() {
  const { id, tableId, index } = useParams();
  const navigate = useNavigate();
  const { knowledgeBases, updateKnowledgeBase } = useKnowledgeBases();
  const { getTemplateById, calculateCompletion } = useKnowledgeBaseTemplates();

  const kb = knowledgeBases.find(k => k.id === id);
  const template = kb ? getTemplateById(kb.template_id) : undefined;
  const table = template?.tables.find(t => t.id === tableId);
  const isEdit = index !== 'new' && index !== undefined;
  const editIdx = isEdit ? parseInt(index!, 10) : -1;

  const [form, setForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!kb || !table) return;
    if (isEdit) {
      const existing = (kb.data as any)[table.id]?.[editIdx];
      if (existing) setForm({ ...existing });
    }
  }, [kb, table, isEdit, editIdx]);

  if (!kb || !template || !table) {
    return <div className="min-h-[100dvh] flex items-center justify-center text-sm text-muted-foreground">Chargement…</div>;
  }

  const requiredOk = table.fields.filter(f => f.required).every(f => {
    const v = form[f.name];
    return v !== undefined && v !== null && String(v).trim() !== '';
  });

  const save = async () => {
    setSaving(true);
    try {
      const all = { ...(kb.data as any) };
      const list = [...(all[table.id] || [])];
      if (isEdit) list[editIdx] = form;
      else list.push(form);
      all[table.id] = list;
      const newCompletion = calculateCompletion(all, kb.structural_info as any, template);
      const ok = await updateKnowledgeBase(kb.id, { data: all, completion_percentage: newCompletion });
      if (ok) {
        toast.success(isEdit ? 'Entrée modifiée' : 'Entrée ajoutée');
        navigate(-1);
      }
    } finally { setSaving(false); }
  };

  const del = async () => {
    if (!isEdit) return;
    setSaving(true);
    try {
      const all = { ...(kb.data as any) };
      const list = [...(all[table.id] || [])];
      list.splice(editIdx, 1);
      all[table.id] = list;
      const newCompletion = calculateCompletion(all, kb.structural_info as any, template);
      const ok = await updateKnowledgeBase(kb.id, { data: all, completion_percentage: newCompletion });
      if (ok) { toast.success('Entrée supprimée'); navigate(-1); }
    } finally { setSaving(false); }
  };

  return (
    <NativeFormScreen
      title={isEdit ? 'Modifier' : 'Ajouter'}
      subtitle={table.name}
      saving={saving}
      canSubmit={requiredOk}
      submitLabel={isEdit ? 'Enregistrer' : 'Ajouter'}
      onSubmit={save}
    >
      {table.fields.map(f => (
        <div key={f.name} className="space-y-1.5">
          <label className="text-sm font-medium block">
            {f.name}
            {f.required && <span className="text-destructive ml-1">*</span>}
          </label>
          <NativeFieldRenderer
            field={f as any}
            value={form[f.name]}
            onChange={(v) => setForm({ ...form, [f.name]: v })}
          />
        </div>
      ))}
      {isEdit && (
        <button
          type="button"
          onClick={del}
          className="w-full h-11 mt-4 rounded-lg border border-destructive/40 text-destructive font-medium active:bg-destructive/5"
        >
          Supprimer cette entrée
        </button>
      )}
    </NativeFormScreen>
  );
}
