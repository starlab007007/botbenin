import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Database, Plus, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useMobileAuth } from '../../hooks/useMobileAuth';
import { useKnowledgeBases } from '@/hooks/useKnowledgeBases';
import MobileScreenHeader from '../../components/MobileScreenHeader';
import NativeKbActionsSheet from '../../components/bots/NativeKbActionsSheet';
import { KnowledgeBase } from '@/types/knowledge-base';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import MyAiAgentsSection from '../agents/MyAiAgentsSection';

const SECTOR_LABEL: Record<string, string> = {
  restaurant: 'Restauration', hotel: 'Hôtellerie', real_estate: 'Immobilier',
  ecommerce: 'E-commerce', training: 'Formation', university: 'Université', clinic: 'Clinique',
  whatsapp_diffusion: 'WhatsApp Diffusion',
};

export default function KnowledgeBasesListScreen() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useMobileAuth();
  const { knowledgeBases, loading, fetchKnowledgeBases, exportKnowledgeBase, deleteKnowledgeBase } = useKnowledgeBases();
  const [selectedKb, setSelectedKb] = useState<KnowledgeBase | null>(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState<KnowledgeBase | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/app/auth'); return; }
    const ch = supabase.channel(`mobile-kb-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'knowledge_bases', filter: `user_id=eq.${user.id}` }, () => fetchKnowledgeBases())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, authLoading, navigate, fetchKnowledgeBases]);

  const openActions = (kb: KnowledgeBase) => { setSelectedKb(kb); setActionsOpen(true); };

  return (
    <div className="min-h-[100dvh] bg-background">
      <MobileScreenHeader title="Création Bots" subtitle="Bases de connaissances" />

      <main className="p-4 pb-32 space-y-3">
        <button
          onClick={() => navigate('/app/agents/new')}
          className="w-full rounded-2xl bg-gradient-to-r from-fuchsia-600 via-orange-500 to-amber-500 text-white p-4 flex items-center gap-3 shadow-md active:scale-[0.98] transition"
        >
          <Sparkles className="h-6 w-6" />
          <div className="text-left flex-1">
            <div className="font-bold">Créer un agent IA</div>
            <div className="text-xs opacity-90">BI · Stock · Présence QR · Conversationnel</div>
          </div>
          <Plus className="h-5 w-5" />
        </button>

        <MyAiAgentsSection />

        {loading && <p className="text-center text-muted-foreground py-10 text-sm">Chargement…</p>}

        {!loading && knowledgeBases.length === 0 && (
          <div className="text-center py-16 px-4">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Database className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-base mb-1">Aucune base</h3>
            <p className="text-sm text-muted-foreground mb-5">
              Créez votre première base pour entraîner votre bot IA
            </p>
            <button
              onClick={() => navigate('/app/bots/new')}
              className="h-12 px-5 rounded-full bg-[#FF6B35] text-white font-semibold inline-flex items-center gap-2 active:scale-95 transition"
            >
              <Plus className="h-5 w-5" /> Créer ma première base
            </button>
          </div>
        )}

        {knowledgeBases.map((kb) => (
          <button
            key={kb.id}
            onClick={() => navigate(`/app/bots/${kb.id}`)}
            onContextMenu={(e) => { e.preventDefault(); openActions(kb); }}
            className="block w-full text-left rounded-2xl border bg-card p-4 shadow-sm active:bg-accent/40 transition"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  {SECTOR_LABEL[kb.sector] || kb.sector}
                </div>
                <div className="font-semibold text-[15px] truncate">{kb.name}</div>
                {kb.description && (
                  <div className="text-xs text-muted-foreground truncate mt-0.5">{kb.description}</div>
                )}
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); openActions(kb); }}
                className="p-2 -mt-1 -mr-1 rounded-full active:bg-accent"
                aria-label="Actions"
              >
                <Sparkles className="h-4 w-4 text-primary" />
              </button>
            </div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Complétion</span>
              <span className="font-semibold text-primary">{kb.completion_percentage}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${kb.completion_percentage}%` }} />
            </div>
            <div className="mt-3 text-[10px] text-muted-foreground">
              Modifiée le {new Date(kb.updated_at).toLocaleDateString('fr-FR')}
            </div>
          </button>
        ))}
      </main>

      {/* FAB */}
      <button
        onClick={() => navigate('/app/bots/new')}
        className="fixed right-4 bottom-24 z-20 h-14 w-14 rounded-full bg-[#FF6B35] text-white shadow-lg flex items-center justify-center active:scale-95 transition"
        style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Créer une base"
      >
        <Plus className="h-6 w-6" />
      </button>

      <NativeKbActionsSheet
        open={actionsOpen}
        onOpenChange={setActionsOpen}
        kb={selectedKb}
        onView={() => selectedKb && navigate(`/app/bots/${selectedKb.id}`)}
        onEdit={() => selectedKb && navigate(`/app/bots/${selectedKb.id}`)}
        onExport={(fmt) => selectedKb && exportKnowledgeBase(selectedKb, fmt)}
        onDelete={() => setConfirmDel(selectedKb)}
      />

      <Sheet open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <SheetContent side="bottom" className="p-0 rounded-t-2xl">
          <div className="p-5">
            <div className="mx-auto w-10 h-1 rounded-full bg-muted mb-4" />
            <h3 className="text-base font-semibold mb-1">Supprimer cette base ?</h3>
            <p className="text-sm text-muted-foreground mb-5">Cette action est irréversible.</p>
            <div className="flex gap-2" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
              <button onClick={() => setConfirmDel(null)} className="flex-1 h-12 rounded-lg border border-input bg-background font-medium active:bg-accent">Annuler</button>
              <button
                onClick={async () => { if (confirmDel) { await deleteKnowledgeBase(confirmDel.id); setConfirmDel(null); } }}
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
