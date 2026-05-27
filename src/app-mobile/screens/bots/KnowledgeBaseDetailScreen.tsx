import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Cloud, Download, MoreVertical, RefreshCw, Save } from 'lucide-react';
import { useKnowledgeBases } from '@/hooks/useKnowledgeBases';
import { useKnowledgeBaseTemplates } from '@/hooks/useKnowledgeBaseTemplates';
import { KnowledgeBase } from '@/types/knowledge-base';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import NativeFieldRenderer from '../../components/bots/NativeFieldRenderer';
import { useSheetCrud } from '../../hooks/useSheetCrud';
import { getSheetNameForTable, isGoogleSheetTemplate } from '../../utils/sheetMapping';
import { toast } from 'sonner';

const getRowValue = (row: Record<string, any>, fieldName?: string) => {
  if (!fieldName) return undefined;
  const direct = row[fieldName];
  if (direct !== undefined && direct !== null && String(direct).trim() !== '') return direct;
  const normalized = fieldName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
  return row[normalized];
};


export default function KnowledgeBaseDetailScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { knowledgeBases, updateKnowledgeBase, exportKnowledgeBase, deleteKnowledgeBase } = useKnowledgeBases();
  const { getTemplateById, calculateCompletion } = useKnowledgeBaseTemplates();

  const [kb, setKb] = useState<KnowledgeBase | null>(null);
  const [structural, setStructural] = useState<Record<string, string>>({});
  const [tablesData, setTablesData] = useState<Record<string, any[]>>({});
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState<string>('structural');
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  useEffect(() => {
    const found = knowledgeBases.find(k => k.id === id);
    if (found) {
      setKb(found);
      setStructural((found.structural_info as any) || {});
      setTablesData((found.data as any) || {});
    }
  }, [id, knowledgeBases]);

  const template = kb ? getTemplateById(kb.template_id) : undefined;
  const completion = useMemo(
    () => (template ? calculateCompletion(tablesData, structural, template) : 0),
    [template, tablesData, structural, calculateCompletion]
  );

  const isGoogleSheetMode = template ? isGoogleSheetTemplate(template) : false;
  const currentTable = template && tab !== 'structural' ? template.tables.find(t => t.id === tab) : null;
  const sheetName = isGoogleSheetMode && currentTable
    ? getSheetNameForTable(template, currentTable.id)
    : null;
  const sheet = useSheetCrud(
    template?.googleSheetConfig?.spreadsheetId,
    sheetName,
    kb?.user_id
  );

  if (!kb || !template) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </div>
    );
  }


  const save = async () => {
    const ok = await updateKnowledgeBase(kb.id, {
      data: tablesData,
      structural_info: structural,
      completion_percentage: completion,
    });
    if (ok) { setDirty(false); toast.success('Enregistré'); }
  };

  const tabs = [{ id: 'structural', label: 'Infos' }, ...template.tables.map(t => ({ id: t.id, label: t.name }))];

  return (
    <div className="fixed inset-0 z-40 bg-background flex flex-col">

        style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="flex items-center gap-2 px-3 py-3">
          <button onClick={() => navigate('/app/bots')} className="p-2 -ml-2 rounded-full active:bg-white/10" aria-label="Retour">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold truncate">{kb.name}</h1>
            <p className="text-[11px] text-white/75 truncate">{template.name} · {completion}%</p>
          </div>
          <button onClick={() => setMenuOpen(true)} className="p-2 -mr-2 rounded-full active:bg-white/10" aria-label="Menu">
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>
        <div className="h-1 bg-white/20">
          <div className="h-full bg-[#FF6B35] transition-all" style={{ width: `${completion}%` }} />
        </div>
        <div className="overflow-x-auto no-scrollbar">
          <div className="flex gap-1.5 px-3 py-2 min-w-max">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
                  tab === t.id ? 'bg-white text-[hsl(var(--wa-green))]' : 'bg-white/15 text-white active:bg-white/25'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 pb-28 space-y-3">
        {tab === 'structural' && template.structuralInfo.map(f => (
          <div key={f.name} className="space-y-1.5">
            <label className="text-sm font-medium">
              {f.description || f.name}
              {f.required && <span className="text-destructive ml-1">*</span>}
            </label>
            <NativeFieldRenderer
              field={f as any}
              value={structural[f.name]}
              onChange={(v) => { setStructural({ ...structural, [f.name]: v }); setDirty(true); }}
            />
          </div>
        ))}

        {tab !== 'structural' && (() => {
          const table = template.tables.find(t => t.id === tab);
          if (!table) return null;
          const useSheet = isGoogleSheetMode && !!sheetName;
          const entries: any[] = useSheet ? sheet.rows : (tablesData[table.id] || []);
          const primary = table.fields[0];
          const secondary = table.fields[1];
          const newHref = useSheet
            ? `/app/bots/${kb.id}/table/${table.id}/entry/new?gs=1`
            : `/app/bots/${kb.id}/table/${table.id}/entry/new`;
          const entryHref = (row: any, idx: number) => useSheet
            ? `/app/bots/${kb.id}/table/${table.id}/entry/gs:${encodeURIComponent(row.id)}`
            : `/app/bots/${kb.id}/table/${table.id}/entry/${idx}`;
          return (
            <>
              {useSheet && (
                <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2 mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <Cloud className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="text-[11px] text-muted-foreground truncate">
                      Synchronisé Google Sheets · {sheet.lastSync ? sheet.lastSync.toLocaleTimeString() : '—'}
                    </span>
                  </div>
                  <button
                    onClick={() => sheet.load()}
                    disabled={sheet.isLoading}
                    className="p-1.5 -mr-1 rounded-full active:bg-accent disabled:opacity-50"
                    aria-label="Actualiser"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${sheet.isLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              )}
              {useSheet && sheet.isLoading && entries.length === 0 && (
                <div className="text-center py-10 text-sm text-muted-foreground">Chargement…</div>
              )}
              {!(useSheet && sheet.isLoading) && entries.length === 0 && (
                <div className="text-center py-10 text-sm text-muted-foreground">
                  Aucune entrée. Ajoutez votre première donnée.
                </div>
              )}
              {entries.map((row, idx) => (
                <button
                  key={(row.id ?? idx).toString()}
                  onClick={() => navigate(entryHref(row, idx))}
                  className="w-full text-left rounded-xl border bg-card p-3.5 flex items-center gap-3 active:bg-accent/40 transition"
                >
                  {primary?.type === 'image' && getRowValue(row, primary.name) ? (
                    <img src={getRowValue(row, primary.name)} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-primary font-semibold text-sm">{(getRowValue(row, primary?.name) || '?').toString().charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[15px] truncate">{getRowValue(row, primary?.name) || 'Sans nom'}</div>
                    {secondary && (
                      <div className="text-xs text-muted-foreground truncate">{getRowValue(row, secondary.name) || ''}</div>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              ))}
              <button
                onClick={() => navigate(newHref)}
                className="w-full h-12 mt-2 rounded-lg border-2 border-dashed border-primary/40 text-primary font-medium active:bg-primary/5"
              >
                + Ajouter une entrée
              </button>
            </>
          );
        })()}
      </main>

      {dirty && (
        <footer className="sticky bottom-0 border-t bg-background/95 backdrop-blur px-4 py-3"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}>
          <button onClick={save} className="w-full h-12 rounded-lg bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition">
            <Save className="h-4 w-4" /> Enregistrer
          </button>
        </footer>
      )}

      {/* Menu Sheet */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="bottom" className="p-0 rounded-t-2xl">
          <div className="py-3 px-4">
            <div className="mx-auto w-10 h-1 rounded-full bg-muted mb-3" />
          </div>
          {(['json', 'excel', 'csv', 'pdf'] as const).map(fmt => (
            <button
              key={fmt}
              onClick={() => { exportKnowledgeBase(kb, fmt); setMenuOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-accent text-left"
            >
              <Download className="h-5 w-5" />
              <span className="text-[15px]">Exporter en {fmt.toUpperCase()}</span>
            </button>
          ))}
          <div className="border-t" />
          <button
            onClick={() => { setMenuOpen(false); setConfirmDel(true); }}
            className="w-full flex items-center gap-3 px-4 py-3.5 text-destructive active:bg-accent text-left"
          >
            Supprimer cette base
          </button>
          <div style={{ height: 'env(safe-area-inset-bottom)' }} />
        </SheetContent>
      </Sheet>

      <Sheet open={confirmDel} onOpenChange={setConfirmDel}>
        <SheetContent side="bottom" className="p-0 rounded-t-2xl">
          <div className="p-5">
            <div className="mx-auto w-10 h-1 rounded-full bg-muted mb-4" />
            <h3 className="text-base font-semibold mb-1">Supprimer cette base ?</h3>
            <p className="text-sm text-muted-foreground mb-5">Action irréversible.</p>
            <div className="flex gap-2" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
              <button onClick={() => setConfirmDel(false)} className="flex-1 h-12 rounded-lg border border-input bg-background font-medium active:bg-accent">Annuler</button>
              <button
                onClick={async () => { await deleteKnowledgeBase(kb.id); navigate('/app/bots', { replace: true }); }}
                className="flex-1 h-12 rounded-lg bg-destructive text-destructive-foreground font-semibold active:opacity-90"
              >
                Supprimer
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
