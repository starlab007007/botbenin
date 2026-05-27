import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, ChevronRight, Database } from 'lucide-react';
import { useKnowledgeBaseTemplates } from '@/hooks/useKnowledgeBaseTemplates';
import { useKnowledgeBases } from '@/hooks/useKnowledgeBases';
import { KnowledgeBaseTemplate } from '@/types/knowledge-base';
import { toast } from 'sonner';
import NativeFieldRenderer from '../../components/bots/NativeFieldRenderer';

export default function KnowledgeBaseCreateWizard() {
  const navigate = useNavigate();
  const { templates, calculateCompletion } = useKnowledgeBaseTemplates();
  const { createKnowledgeBase } = useKnowledgeBases();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [template, setTemplate] = useState<KnowledgeBaseTemplate | null>(null);
  const [name, setName] = useState('');
  const [structural, setStructural] = useState<Record<string, string>>({});
  const [tablesData, setTablesData] = useState<Record<string, Record<string, any>[]>>({});
  const [saving, setSaving] = useState(false);

  const completion = template ? calculateCompletion(tablesData, structural, template) : 0;

  const onSelectTemplate = (t: KnowledgeBaseTemplate) => {
    setTemplate(t);
    setName(`Ma base ${t.name}`);
    setStep(2);
  };

  const onBack = () => {
    if (step === 1) navigate(-1);
    else setStep((step - 1) as 1 | 2);
  };

  const submit = async () => {
    if (!template) return;
    setSaving(true);
    try {
      const res = await createKnowledgeBase({
        name,
        sector: template.sector,
        template_id: template.id,
        description: template.description,
        data: tablesData,
        structural_info: structural,
        completion_percentage: completion,
        is_active: true,
      });
      if (res) {
        toast.success('Base créée');
        navigate(`/app/bots/${res.id}`, { replace: true });
      }
    } finally { setSaving(false); }
  };

  const requiredStructuralOk = template
    ? template.structuralInfo.filter(f => f.required).every(f => (structural[f.name] || '').trim().length > 0)
    : false;

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <header className="sticky top-0 z-30 bg-[hsl(var(--wa-green))] text-white shadow-sm"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="flex items-center gap-2 px-3 py-3">
          <button onClick={onBack} className="p-2 -ml-2 rounded-full active:bg-white/10" aria-label="Retour">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold leading-tight truncate">Nouvelle base</h1>
            <p className="text-[11px] text-white/75">Étape {step}/3 — {step === 1 ? 'Secteur' : step === 2 ? 'Infos essentielles' : 'Données'}</p>
          </div>
        </div>
        <div className="h-1 bg-white/20">
          <div className="h-full bg-[#FF6B35] transition-all" style={{ width: `${(step / 3) * 100}%` }} />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 pb-28 space-y-4">
        {step === 1 && (
          <>
            <h2 className="text-lg font-bold">Choisissez votre secteur</h2>
            <p className="text-sm text-muted-foreground -mt-2">Un template adapté pour entraîner votre bot IA</p>
            <div className="space-y-2.5 pt-2">
              {templates.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onSelectTemplate(t)}
                  className="w-full text-left rounded-2xl border bg-card p-4 flex items-center gap-3 active:bg-accent/40 transition"
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${t.color} flex items-center justify-center shadow-sm shrink-0`}>
                    <Database className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[15px] truncate">{t.name}</div>
                    <div className="text-xs text-muted-foreground line-clamp-2">{t.description}</div>
                    <div className="text-[10px] text-muted-foreground mt-1">{t.tables.length} tables · {t.structuralInfo.length} infos</div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          </>
        )}

        {step === 2 && template && (
          <>
            <h2 className="text-lg font-bold">Infos essentielles</h2>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nom de la base *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-12 px-3 rounded-lg border border-input bg-background text-[15px] outline-none focus:border-primary"
              />
            </div>
            {template.structuralInfo.map(f => (
              <div key={f.name} className="space-y-1.5">
                <label className="text-sm font-medium">
                  {f.description || f.name}
                  {f.required && <span className="text-destructive ml-1">*</span>}
                </label>
                <NativeFieldRenderer
                  field={f as any}
                  value={structural[f.name]}
                  onChange={(v) => setStructural({ ...structural, [f.name]: v })}
                />
              </div>
            ))}
          </>
        )}

        {step === 3 && template && (
          <>
            <h2 className="text-lg font-bold">Données (optionnel)</h2>
            <p className="text-sm text-muted-foreground -mt-2">Vous pourrez compléter plus tard depuis le détail de la base.</p>
            <div className="rounded-xl border bg-card p-4 mt-2">
              <div className="text-sm text-muted-foreground mb-1">Récapitulatif</div>
              <div className="text-[15px] font-semibold truncate">{name}</div>
              <div className="text-xs text-muted-foreground">{template.name}</div>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Complétion estimée</span>
                <span className="font-semibold text-primary">{completion}%</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-1.5">
                <div className="h-full bg-primary" style={{ width: `${completion}%` }} />
              </div>
            </div>
          </>
        )}
      </main>

      <footer className="sticky bottom-0 border-t bg-background/95 backdrop-blur px-4 py-3"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}>
        {step === 1 && null}
        {step === 2 && (
          <button
            onClick={() => setStep(3)}
            disabled={!name.trim() || !requiredStructuralOk}
            className="w-full h-12 rounded-lg bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition"
          >
            Continuer <ArrowRight className="h-4 w-4" />
          </button>
        )}
        {step === 3 && (
          <button
            onClick={submit}
            disabled={saving}
            className="w-full h-12 rounded-lg bg-[#FF6B35] text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition"
          >
            <Check className="h-4 w-4" /> {saving ? 'Création…' : 'Créer la base'}
          </button>
        )}
      </footer>
    </div>
  );
}
