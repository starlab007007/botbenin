import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMobileAuth } from "../hooks/useMobileAuth";
import { useWaDiffusion, type WaCampaign } from "@/hooks/useWaDiffusion";
import { useDiffusionSessions, type DiffSession } from "@/hooks/useDiffusionSessions";
import { useCampaignDetails } from "@/hooks/useCampaignDetails";
import { useWAHADashboard } from "@/hooks/useWAHADashboard";
import { useAdminRole } from "@/hooks/useAdminRole";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, Users, Send, Smartphone, BarChart3, Upload, Search, ShieldCheck,
  CheckCircle2, XCircle, HelpCircle, Ban, Archive, Trash2, ChevronRight, FileText,
  Image as ImageIcon, Video as VideoIcon, File as FileIcon, Link as LinkIcon, Phone,
  Sparkles, Loader2, MoreVertical, Play, Pause, RefreshCw, Eye, Copy, Settings, QrCode,
  Power, X, CheckCheck, MessageCircle, AlertCircle, Share2, Megaphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import NativeSelectSheet from "../components/native/NativeSelectSheet";
import { normalizeBeninWhatsApp, normalizePhone, COUNTRIES } from "@/lib/phone";
import { cn } from "@/lib/utils";
import AudienceBuilder from "@/components/diffusion/AudienceBuilder";
import DiffusionTrackingDashboard from "@/components/diffusion/DiffusionTrackingDashboard";

/* ============================================================
   NATIVE FULL-SCREEN OVERLAY (style Activity Android)
   ============================================================ */
function NativeScreen({
  title, subtitle, onBack, children, footer, headerRight,
}: {
  title: string; subtitle?: string; onBack: () => void;
  children: React.ReactNode; footer?: React.ReactNode; headerRight?: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col overscroll-contain">
      <header
        className="shrink-0 bg-[hsl(165_91%_18%)] text-white shadow-sm"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="flex items-center gap-2 px-3 py-3">
          <button onClick={onBack} className="p-2 -ml-2 rounded-full active:bg-white/10" aria-label="Retour">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold leading-tight truncate">{title}</h1>
            {subtitle && <p className="text-[11px] text-white/75 truncate">{subtitle}</p>}
          </div>
          {headerRight}
        </div>
      </header>
      <main className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pt-4 pb-8 space-y-4 [-webkit-overflow-scrolling:touch]">
        {children}
        {!footer && <div style={{ height: "env(safe-area-inset-bottom)" }} />}
      </main>
      {footer && (
        <footer
          className="shrink-0 border-t bg-background/95 backdrop-blur px-4 py-3"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
        >
          {footer}
        </footer>
      )}
    </div>
  );
}

/* ============================================================
   ROOT SCREEN — Tabs + dispatch to native overlays
   ============================================================ */
type TabKey = "ia" | "campaigns" | "contacts" | "sessions" | "stats";
type Overlay =
  | { kind: "none" }
  | { kind: "campaign-new" }
  | { kind: "campaign-edit"; campaign: WaCampaign }
  | { kind: "campaign-details"; campaign: WaCampaign }
  | { kind: "contact-add" }
  | { kind: "contact-import" }
  | { kind: "session-form"; session: DiffSession | null };

export default function DiffusionScreen() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useMobileAuth();
  const d = useWaDiffusion();
  const s = useDiffusionSessions();
  const [tab, setTab] = useState<TabKey>("ia");
  const [overlay, setOverlay] = useState<Overlay>({ kind: "none" });

  useEffect(() => {
    if (!authLoading && !user) navigate("/app/auth");
  }, [user, authLoading, navigate]);

  return (
    <div className="fixed inset-0 bg-background flex flex-col overscroll-contain">
      <header
        className="shrink-0 bg-[hsl(165_91%_18%)] text-white"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="flex items-center gap-2 px-4 py-3">
          <Megaphone className="h-5 w-5" />
          <h1 className="flex-1 text-lg font-semibold">Diffusion WhatsApp</h1>
          <button
            onClick={() => d.refresh()}
            className="p-2 -mr-2 rounded-full active:bg-white/10"
            aria-label="Actualiser"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex overflow-x-auto scrollbar-none px-2 pb-1 gap-1">
          {([
            { k: "ia", l: "Diffusion IA", I: Sparkles },
            { k: "campaigns", l: "Campagnes", I: Send },
            { k: "contacts", l: "Contacts", I: Users },
            { k: "sessions", l: "Sessions", I: Smartphone },
            { k: "stats", l: "Suivi", I: BarChart3 },
          ] as { k: TabKey; l: string; I: any }[]).map(({ k, l, I }) => {
            const active = tab === k;
            return (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-full text-sm whitespace-nowrap transition-colors",
                  active ? "bg-white text-[hsl(165_91%_18%)] font-semibold" : "text-white/85 active:bg-white/10",
                )}
              >
                <I className="h-4 w-4" />
                {l}
              </button>
            );
          })}
        </nav>
      </header>

      <main
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 5.5rem)" }}
      >
        {tab === "ia" && (
          <div className="p-4">
            <AudienceBuilder onSubmitted={() => setTab("campaigns")} />
          </div>
        )}
        {tab === "campaigns" && (
          <CampaignsTab
            d={d} s={s}
            onNew={() => setOverlay({ kind: "campaign-new" })}
            onEdit={(c) => setOverlay({ kind: "campaign-edit", campaign: c })}
            onDetails={(c) => setOverlay({ kind: "campaign-details", campaign: c })}
            onGotoSessions={() => setTab("sessions")}
          />
        )}
        {tab === "contacts" && (
          <ContactsTab
            d={d}
            onAdd={() => setOverlay({ kind: "contact-add" })}
            onImport={() => setOverlay({ kind: "contact-import" })}
          />
        )}
        {tab === "sessions" && (
          <SessionsTab s={s} onOpen={(row) => setOverlay({ kind: "session-form", session: row })} />
        )}
        {tab === "stats" && <StatsTab d={d} />}
      </main>

      {/* === Overlays === */}
      {overlay.kind === "campaign-new" && (
        <CampaignFormScreen d={d} s={s} onClose={() => setOverlay({ kind: "none" })} onGotoSessions={() => { setOverlay({ kind: "none" }); setTab("sessions"); }} />
      )}
      {overlay.kind === "campaign-edit" && (
        <CampaignFormScreen d={d} s={s} campaign={overlay.campaign} onClose={() => setOverlay({ kind: "none" })} onGotoSessions={() => { setOverlay({ kind: "none" }); setTab("sessions"); }} />
      )}
      {overlay.kind === "campaign-details" && (
        <CampaignDetailsScreen campaign={overlay.campaign} d={d}
          onClose={() => setOverlay({ kind: "none" })}
          onEdit={() => setOverlay({ kind: "campaign-edit", campaign: overlay.campaign })} />
      )}
      {overlay.kind === "contact-add" && (
        <ContactAddScreen d={d} onClose={() => setOverlay({ kind: "none" })} />
      )}
      {overlay.kind === "contact-import" && (
        <ContactImportScreen d={d} onClose={() => setOverlay({ kind: "none" })} />
      )}
      {overlay.kind === "session-form" && (
        <SessionFormScreen session={overlay.session} onClose={() => { setOverlay({ kind: "none" }); s.refresh(); }} />
      )}
    </div>
  );
}

/* ============================================================
   CAMPAIGNS TAB
   ============================================================ */
function CampaignsTab({
  d, s, onNew, onEdit, onDetails, onGotoSessions,
}: {
  d: ReturnType<typeof useWaDiffusion>; s: ReturnType<typeof useDiffusionSessions>;
  onNew: () => void; onEdit: (c: WaCampaign) => void; onDetails: (c: WaCampaign) => void;
  onGotoSessions: () => void;
}) {
  return (
    <div className="p-4 space-y-3">
      <button
        onClick={onNew}
        className="w-full flex items-center justify-center gap-2 h-12 rounded-xl bg-[hsl(165_91%_18%)] text-white font-semibold active:opacity-90"
      >
        <Plus className="h-5 w-5" /> Nouvelle campagne
      </button>

      {s.all.length === 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <div className="font-semibold mb-1">Aucune session WhatsApp connectée</div>
          <p className="text-xs mb-2">Connectez une session pour envoyer des campagnes.</p>
          <Button size="sm" variant="outline" onClick={onGotoSessions}>Configurer</Button>
        </div>
      )}

      {d.campaigns.length === 0 ? (
        <EmptyState icon={Send} title="Aucune campagne" desc="Créez votre première campagne WhatsApp." />
      ) : (
        d.campaigns.map(c => (
          <CampaignCard key={c.id} c={c} d={d}
            onDetails={() => onDetails(c)} onEdit={() => onEdit(c)} />
        ))
      )}
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-foreground",
  scheduled: "bg-blue-100 text-blue-800",
  running: "bg-emerald-100 text-emerald-800",
  paused: "bg-amber-100 text-amber-800",
  done: "bg-slate-200 text-slate-700",
  failed: "bg-red-100 text-red-800",
};

function CampaignCard({
  c, d, onDetails, onEdit,
}: { c: WaCampaign; d: ReturnType<typeof useWaDiffusion>; onDetails: () => void; onEdit: () => void }) {
  const [actions, setActions] = useState(false);
  const total = c.stats?.total ?? 0;
  const sent = c.stats?.sent ?? 0;
  const failed = c.stats?.failed ?? 0;
  const pending = c.stats?.pending ?? ((c.stats?.queued ?? 0) + (c.stats?.sending ?? 0));
  const pct = total ? Math.round((sent / total) * 100) : 0;

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <button onClick={onDetails} className="w-full text-left p-3 active:bg-muted/40">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate">{c.name}</div>
            <div className="text-[11px] text-muted-foreground capitalize">
              {c.type} · {new Date(c.created_at).toLocaleString("fr-FR")}
            </div>
          </div>
          <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", STATUS_COLORS[c.status] ?? "bg-muted")}>
            {c.status}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); setActions(true); }}
            className="p-1.5 -mr-1 rounded-full active:bg-muted"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
        {total > 0 && (
          <div className="mt-2 space-y-1">
            <Progress value={pct} />
            <div className="text-[11px] text-muted-foreground flex justify-between">
              <span>{sent}/{total} envoyés ({pct}%)</span>
              {failed > 0 && <span className="text-destructive">{failed} échec(s)</span>}
            </div>
          </div>
        )}
      </button>

      {c.status === "draft" && (
        <button
          onClick={() => d.launchCampaign(c.id, { generateVariants: c.ai_variation, body: c.body })}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 border-t bg-emerald-50 text-emerald-700 font-medium active:bg-emerald-100"
        >
          <Play className="h-4 w-4" /> Lancer
        </button>
      )}
      {c.status === "running" && pending > 0 && (
        <button
          onClick={() => d.runWorker(c.id).then(() => toast.success("Worker déclenché"))}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 border-t bg-blue-50 text-blue-700 font-medium active:bg-blue-100"
        >
          <Send className="h-4 w-4" /> Envoyer maintenant ({pending})
        </button>
      )}

      <CampaignActionsSheet
        open={actions} onClose={() => setActions(false)}
        c={c} d={d} pending={pending}
        onDetails={onDetails} onEdit={onEdit}
      />
    </div>
  );
}

function CampaignActionsSheet({
  open, onClose, c, d, pending, onDetails, onEdit,
}: {
  open: boolean; onClose: () => void; c: WaCampaign;
  d: ReturnType<typeof useWaDiffusion>; pending: number;
  onDetails: () => void; onEdit: () => void;
}) {
  const Item = ({ icon: I, label, onClick, danger }: any) => (
    <button
      onClick={() => { onClose(); setTimeout(onClick, 50); }}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-4 text-left active:bg-muted",
        danger && "text-destructive",
      )}
    >
      <I className="h-5 w-5 shrink-0" />
      <span className="text-[15px]">{label}</span>
    </button>
  );
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="p-0 rounded-t-2xl">
        <div className="px-4 pt-3 pb-2 border-b">
          <div className="font-semibold truncate">{c.name}</div>
          <div className="text-[11px] text-muted-foreground capitalize">{c.type} · {c.status}</div>
        </div>
        <div className="py-1 divide-y" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          <Item icon={Eye} label="Voir détails" onClick={onDetails} />
          <Item icon={Settings} label="Modifier la campagne" onClick={onEdit} />
          {(c.status === "failed" || c.status === "done") && (
            <Item icon={RefreshCw} label="Relancer la campagne" onClick={() => d.relaunchCampaign(c.id)} />
          )}
          {(c.status === "running" || c.status === "failed") && pending > 0 && (
            <Item icon={Send} label="Envoyer maintenant" onClick={() => d.runWorker(c.id).then(() => toast.success("Worker déclenché"))} />
          )}
          <Item icon={Copy} label="Dupliquer" onClick={() => d.duplicateCampaign(c)} />
          {c.status === "running" && <Item icon={Pause} label="Mettre en pause" onClick={() => d.pauseCampaign(c.id)} />}
          {c.status === "paused" && <Item icon={Play} label="Reprendre" onClick={() => d.resumeCampaign(c.id)} />}
          <Item icon={Trash2} label="Supprimer" danger
            onClick={() => { if (confirm(`Supprimer "${c.name}" ?`)) d.deleteCampaign(c.id); }} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ============================================================
   CAMPAIGN FORM (Création / Édition) — Plein écran natif
   ============================================================ */
const TYPE_OPTIONS = [
  { v: "text", l: "Texte", I: FileText },
  { v: "photo", l: "Photo + texte", I: ImageIcon },
  { v: "video", l: "Vidéo + texte", I: VideoIcon },
  { v: "audio", l: "Audio", I: Phone },
  { v: "file", l: "Document + texte", I: FileIcon },
  { v: "link", l: "Lien + texte", I: LinkIcon },
];

const ACCEPT_BY_TYPE: Record<string, string> = {
  photo: "image/*",
  video: "video/*",
  audio: "audio/*",
  file: ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.csv",
};

function CampaignFormScreen({
  d, s, campaign, onClose, onGotoSessions,
}: {
  d: ReturnType<typeof useWaDiffusion>;
  s: ReturnType<typeof useDiffusionSessions>;
  campaign?: WaCampaign;
  onClose: () => void;
  onGotoSessions: () => void;
}) {
  const isEdit = !!campaign;
  const [name, setName] = useState(campaign?.name ?? "");
  const [type, setType] = useState(campaign?.type ?? "text");
  const [body, setBody] = useState(campaign?.body ?? "");
  const [mediaUrl, setMediaUrl] = useState(campaign?.media_url ?? "");
  const [sessionId, setSessionId] = useState(campaign?.session_id ?? "");
  const [selected, setSelected] = useState<Set<string>>(new Set(campaign?.extra_contact_ids ?? []));
  const [aiVariation, setAiVariation] = useState(campaign?.ai_variation ?? true);
  const [throttle, setThrottle] = useState<number>(campaign?.throttle_per_hour ?? 30);
  const [hStart, setHStart] = useState((campaign?.active_hours_start ?? "08:00:00").slice(0, 5));
  const [hEnd, setHEnd] = useState((campaign?.active_hours_end ?? "20:00:00").slice(0, 5));
  const [saving, setSaving] = useState(false);
  const [audienceOpen, setAudienceOpen] = useState(false);

  const typeLabel = TYPE_OPTIONS.find(t => t.v === type)?.l ?? type;
  const sessionLabel = useMemo(() => {
    const x = s.all.find(x => x.id === sessionId);
    return x ? `${x.session_name}${x.phone_number ? " · " + x.phone_number : ""}` : "";
  }, [sessionId, s.all]);

  const sessionOptions = s.all.map(x => `${x.session_name}${x.phone_number ? " · " + x.phone_number : ""}`);
  const sessionFromLabel = (label: string) => {
    const idx = sessionOptions.indexOf(label);
    return s.all[idx]?.id ?? "";
  };

  const doSubmit = async (launchAfter: boolean) => {
    if (!name.trim()) { toast.error("Nom obligatoire"); return; }
    if (!body.trim()) { toast.error("Message obligatoire"); return; }
    if (!isEdit && !sessionId) { toast.error("Sélectionnez une session"); return; }
    if (!isEdit && selected.size === 0) { toast.error("Sélectionnez au moins un contact"); return; }
    setSaving(true);
    try {
      if (isEdit) {
        const ok = await d.updateCampaign(campaign!.id, {
          name: name.trim(), type, body,
          media_url: mediaUrl.trim() || null,
          throttle_per_hour: Number(throttle) || 30,
          active_hours_start: `${hStart}:00`, active_hours_end: `${hEnd}:00`,
        });
        if (ok) onClose();
      } else {
        const row = await d.createCampaign({
          name: name.trim(), type, body,
          media_url: mediaUrl.trim() || null,
          session_id: sessionId,
          extra_contact_ids: [...selected],
          throttle_per_hour: Number(throttle) || 30,
          active_hours_start: `${hStart}:00`, active_hours_end: `${hEnd}:00`,
          ai_variation: aiVariation,
        });
        if (row) {
          if (launchAfter) {
            const launched = await d.launchCampaign((row as any).id, { generateVariants: aiVariation, body });
            if (launched) toast.success("🚀 Campagne lancée !");
          } else {
            toast.success("Campagne créée (brouillon)");
          }
          onClose();
        }
      }
    } finally { setSaving(false); }
  };
  const submit = () => doSubmit(false);
  const submitAndLaunch = () => doSubmit(true);

  return (
    <NativeScreen
      title={isEdit ? "Modifier la campagne" : "Nouvelle campagne"}
      subtitle="WhatsApp · Diffusion"
      onBack={onClose}
      footer={
        isEdit ? (
          <Button onClick={submit} disabled={saving} className="w-full h-12 text-base font-semibold bg-[hsl(165_91%_18%)]">
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Enregistrer
          </Button>
        ) : (
          <div className="flex flex-col gap-2">
            <Button onClick={submitAndLaunch} disabled={saving} className="w-full h-12 text-base font-semibold bg-[hsl(165_91%_18%)] hover:bg-[hsl(165_91%_15%)]">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
              Créer & Lancer maintenant
            </Button>
            <Button onClick={submit} disabled={saving} variant="outline" className="w-full h-11 text-sm font-medium">
              Enregistrer comme brouillon
            </Button>
          </div>
        )
      }
    >
      <Field label="Nom de la campagne">
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Promo Tabaski" className="h-12 text-base" />
      </Field>

      <Field label="Type de message">
        <NativeSelectSheet
          label="Type"
          value={typeLabel}
          onChange={(label) => {
            const o = TYPE_OPTIONS.find(t => t.l === label);
            if (o) setType(o.v);
          }}
          options={TYPE_OPTIONS.map(t => t.l)}
        />
      </Field>

      {(type === "photo" || type === "video" || type === "audio" || type === "file") && (
        <Field label={`Pièce jointe (${type}) — facultative`}>
          <NativeMediaPicker type={type} value={mediaUrl} onChange={setMediaUrl} />
        </Field>
      )}
      {type === "link" && (
        <Field label="URL du lien (facultative)">
          <Input value={mediaUrl} onChange={e => setMediaUrl(e.target.value)} placeholder="https://exemple.com/page" className="h-12 text-base" inputMode="url" />
          <p className="text-[11px] text-muted-foreground mt-1">L'URL est ajoutée au message pour générer un aperçu WhatsApp.</p>
        </Field>
      )}

      <Field label="Message">
        <Textarea
          value={body}
          onChange={e => setBody(e.target.value.slice(0, 1024))}
          rows={6}
          placeholder={"Bonjour {prenom}, ..."}
          className="text-base"
        />
        <div className="flex justify-between mt-1 text-[11px] text-muted-foreground">
          <span>Variables : {"{nom}"}, {"{prenom}"}, {"{tag}"}</span>
          <span>{body.length}/1024</span>
        </div>
      </Field>

      {!isEdit && (
        <>
          <Field label="Session WAHA">
            {s.all.length === 0 ? (
              <div className="border border-dashed rounded-lg p-3 text-xs text-center bg-amber-50">
                Aucune session disponible.
                <button onClick={onGotoSessions} className="ml-2 underline text-primary">Créer une session</button>
              </div>
            ) : (
              <NativeSelectSheet
                label="Choisir une session"
                value={sessionLabel}
                onChange={(label) => setSessionId(sessionFromLabel(label))}
                options={sessionOptions}
                placeholder="Aucune session"
              />
            )}
          </Field>

          <Field label={`Audience (${selected.size} sélectionnés)`}>
            <button
              onClick={() => setAudienceOpen(true)}
              className="w-full flex items-center justify-between gap-2 h-12 px-3 rounded-lg border bg-background text-left active:bg-accent"
            >
              <span className={cn("truncate", !selected.size && "text-muted-foreground")}>
                {selected.size ? `${selected.size} contact(s) sélectionné(s)` : "Choisir des destinataires"}
              </span>
              <ChevronRight className="h-5 w-5 opacity-60" />
            </button>
          </Field>

          <Field>
            <label className="flex items-center justify-between gap-3 p-3 rounded-lg border">
              <span className="flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-amber-500" />
                Variantes IA anti-spam
              </span>
              <Switch checked={aiVariation} onCheckedChange={setAiVariation} />
            </label>
          </Field>
        </>
      )}

      <div className="rounded-xl border p-3 space-y-3 bg-muted/30">
        <div className="text-sm font-semibold">⚙️ Anti-ban</div>
        <Field label="Envois max / heure">
          <Input type="number" inputMode="numeric" min={1} value={throttle}
            onChange={e => setThrottle(Number(e.target.value))} className="h-12 text-base" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Début actif">
            <Input type="time" value={hStart} onChange={e => setHStart(e.target.value)} className="h-12 text-base" />
          </Field>
          <Field label="Fin active">
            <Input type="time" value={hEnd} onChange={e => setHEnd(e.target.value)} className="h-12 text-base" />
          </Field>
        </div>
      </div>

      {isEdit && (
        <p className="text-[11px] text-muted-foreground">
          Astuce : après modification, ouvrez le menu de la campagne et utilisez « Relancer la campagne » pour renvoyer aux contacts.
        </p>
      )}

      <AudiencePickerSheet
        open={audienceOpen} onClose={() => setAudienceOpen(false)}
        contacts={d.contacts.filter(c => !c.opt_out && !c.archived)}
        selected={selected} onChange={setSelected}
      />
    </NativeScreen>
  );
}

function AudiencePickerSheet({
  open, onClose, contacts, selected, onChange,
}: {
  open: boolean; onClose: () => void;
  contacts: ReturnType<typeof useWaDiffusion>["contacts"];
  selected: Set<string>; onChange: (s: Set<string>) => void;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return contacts;
    return contacts.filter(c =>
      c.display_name?.toLowerCase().includes(s) || c.phone_e164.includes(s)
    );
  }, [q, contacts]);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    onChange(next);
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="p-0 h-[92dvh] max-h-[92dvh] rounded-t-2xl flex flex-col">
        <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
          <h2 className="text-base font-semibold">Choisir des destinataires</h2>
          <button onClick={onClose} className="p-2 -mr-2 rounded-full active:bg-accent" aria-label="Fermer"><X className="h-5 w-5" /></button>
        </div>
        <div className="px-4 pb-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher…" className="h-11 pl-9" />
          </div>
        </div>
        <div className="flex items-center justify-between px-4 pb-2 gap-2 shrink-0">
          <span className="text-xs text-muted-foreground">{selected.size}/{contacts.length} sélectionné(s)</span>
          <div className="flex gap-2">
            <button onClick={() => onChange(new Set(contacts.map(c => c.id)))} className="text-xs underline">Tous</button>
            <button onClick={() => onChange(new Set())} className="text-xs underline">Aucun</button>
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain divide-y [-webkit-overflow-scrolling:touch]">
          {filtered.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">Aucun contact</p>
          )}
          {filtered.map(c => {
            const on = selected.has(c.id);
            return (
              <button key={c.id} onClick={() => toggle(c.id)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-accent">
                <div className={cn(
                  "h-5 w-5 rounded border-2 flex items-center justify-center shrink-0",
                  on ? "bg-[hsl(165_91%_18%)] border-[hsl(165_91%_18%)]" : "border-muted-foreground/40"
                )}>
                  {on && <CheckCircle2 className="h-3 w-3 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{c.display_name || "—"}</div>
                  <div className="text-[11px] text-muted-foreground font-mono">{c.phone_e164}</div>
                </div>
                {c.is_whatsapp === true && <Badge className="bg-green-500 text-white text-[10px]">WA</Badge>}
              </button>
            );
          })}
        </div>
        <div className="border-t p-3" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}>
          <Button onClick={onClose} className="w-full h-12 bg-[hsl(165_91%_18%)]">
            Valider ({selected.size})
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ============================================================
   NATIVE MEDIA PICKER — file input (Android natif via WebView)
   ============================================================ */
function NativeMediaPicker({ type, value, onChange }: { type: string; value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) { toast.error("Fichier trop volumineux (max 50 Mo)"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `wa-diffusion/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("public-media").upload(path, file, { contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("public-media").getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success("Fichier téléversé");
    } catch (e: any) { toast.error(e?.message || "Échec téléversement"); }
    finally { setUploading(false); }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => ref.current?.click()}
        disabled={uploading}
        className="w-full flex items-center justify-center gap-2 h-12 rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 text-primary font-medium active:bg-primary/10"
      >
        {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
        {uploading ? "Envoi…" : value ? "Remplacer le fichier" : "Joindre depuis le téléphone"}
      </button>
      <input
        ref={ref}
        type="file"
        accept={ACCEPT_BY_TYPE[type] || "*/*"}
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.currentTarget.value = ""; }}
      />
      <Input
        value={value} onChange={e => onChange(e.target.value)}
        placeholder="…ou collez une URL https publique"
        className="h-11"
        inputMode="url"
      />
      {value && type === "photo" && <img src={value} alt="Aperçu" className="rounded-lg max-h-48 w-full object-cover" />}
      {value && type === "video" && <video src={value} controls className="rounded-lg max-h-48 w-full" />}
      {value && type === "audio" && <audio src={value} controls className="w-full" />}
    </div>
  );
}

/* ============================================================
   CAMPAIGN DETAILS — Plein écran natif
   ============================================================ */
function CampaignDetailsScreen({
  campaign, d, onClose, onEdit,
}: { campaign: WaCampaign; d: ReturnType<typeof useWaDiffusion>; onClose: () => void; onEdit: () => void }) {
  const { jobs, stats, retryFailed, retryOne, refresh } = useCampaignDetails(campaign.id);
  const [view, setView] = useState<"overview" | "recipients" | "preview" | "errors">("overview");

  const errorGroups = useMemo(() => {
    const m = new Map<string, number>();
    for (const j of jobs) if (j.status === "failed" && j.last_error) {
      const k = j.last_error.slice(0, 80); m.set(k, (m.get(k) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [jobs]);

  return (
    <NativeScreen
      title={campaign.name}
      subtitle={`${campaign.type} · ${campaign.status}`}
      onBack={onClose}
      headerRight={
        <button onClick={refresh} className="p-2 rounded-full active:bg-white/10"><RefreshCw className="h-5 w-5" /></button>
      }
    >
      <div className="flex gap-1 -mx-1 overflow-x-auto scrollbar-none">
        {([
          { k: "overview", l: "Vue", I: BarChart3 },
          { k: "recipients", l: "Destinataires", I: Users },
          { k: "preview", l: "Aperçu", I: Smartphone },
          { k: "errors", l: `Erreurs${stats.failed ? ` (${stats.failed})` : ""}`, I: AlertCircle },
        ] as any[]).map(({ k, l, I }) => (
          <button key={k} onClick={() => setView(k)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-full text-xs whitespace-nowrap",
              view === k ? "bg-[hsl(165_91%_18%)] text-white" : "bg-muted text-foreground/70"
            )}>
            <I className="h-3.5 w-3.5" />{l}
          </button>
        ))}
      </div>

      {view === "overview" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Kpi label="Cibles" value={stats.total} />
            <Kpi label="Envoyés" value={stats.sent} pct={stats.pct("sent")} />
            <Kpi label="Livrés" value={stats.delivered} pct={stats.pct("delivered")} />
            <Kpi label="Lus" value={stats.read} pct={stats.pct("read")} highlight />
            <Kpi label="Répondus" value={stats.replied} />
            <Kpi label="En attente" value={stats.queued + stats.sending} />
            <Kpi label="Échecs" value={stats.failed} variant="destructive" />
            <Kpi label="Ignorés" value={stats.skipped} />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs"><span>Progression d'envoi</span><span>{stats.pct("sent")}%</span></div>
            <Progress value={stats.pct("sent")} />
            <div className="flex justify-between text-xs"><span>Taux de lecture</span><span>{stats.pct("read")}%</span></div>
            <Progress value={stats.pct("read")} />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={onEdit}><Settings className="h-4 w-4 mr-1" />Modifier</Button>
            {stats.failed > 0 && (
              <Button size="sm" variant="destructive" onClick={retryFailed}>
                <RefreshCw className="h-4 w-4 mr-1" />Relancer {stats.failed} échec(s)
              </Button>
            )}
            {(campaign.status === "failed" || campaign.status === "done") && (
              <Button size="sm" onClick={() => d.relaunchCampaign(campaign.id)}>
                <RefreshCw className="h-4 w-4 mr-1" />Relancer la campagne
              </Button>
            )}
          </div>
        </div>
      )}

      {view === "recipients" && (
        <div className="divide-y border rounded-xl bg-card">
          {jobs.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Aucun envoi planifié</p>}
          {jobs.map(j => (
            <div key={j.id} className="p-3 flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{j.contact_name || "—"}</div>
                <div className="text-[11px] text-muted-foreground font-mono">{j.to_phone}</div>
                {j.last_error && <div className="text-[10px] text-destructive truncate">{j.last_error}</div>}
              </div>
              <JobStatusBadge j={j} />
              {(j.status === "failed" || j.status === "skipped") && (
                <button onClick={() => retryOne(j.id)} className="p-1.5 rounded-full active:bg-muted">
                  <RefreshCw className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {view === "preview" && (
        <div className="rounded-xl overflow-hidden border bg-card max-w-sm mx-auto">
          <div className="bg-[#075E54] text-white px-4 py-3 flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm">
              {campaign.name?.charAt(0)?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">{campaign.name}</div>
              <div className="text-[10px] opacity-70">Aperçu chez le destinataire</div>
            </div>
          </div>
          <div className="bg-[#ECE5DD] p-4 min-h-[300px]">
            <div className="flex justify-end">
              <div className="bg-[#DCF8C6] rounded-lg max-w-[85%] shadow-sm">
                {campaign.media_url && (campaign.type === "photo" || campaign.type === "video") && (
                  <div className="p-1">
                    {campaign.type === "photo"
                      ? <img src={campaign.media_url} className="rounded-md max-h-48 w-full object-cover" />
                      : <video src={campaign.media_url} className="rounded-md max-h-48 w-full" muted />}
                  </div>
                )}
                <div className="px-3 py-2">
                  <p className="text-[14px] text-gray-900 whitespace-pre-wrap break-words leading-snug">{campaign.body}</p>
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <span className="text-[11px] text-gray-500">12:34</span>
                    <CheckCheck className="h-4 w-4 text-[#53BDEB]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {view === "errors" && (
        <div className="space-y-2">
          {errorGroups.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">Aucune erreur 🎉</p>
          ) : (
            <>
              <Button size="sm" variant="destructive" onClick={retryFailed} className="w-full">
                <RefreshCw className="h-4 w-4 mr-1" />Tout relancer ({stats.failed})
              </Button>
              {errorGroups.map(([err, count]) => (
                <div key={err} className="border rounded-lg p-3 bg-destructive/5">
                  <Badge variant="destructive" className="mb-1">{count} envoi(s)</Badge>
                  <div className="text-xs font-mono break-words">{err}</div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </NativeScreen>
  );
}

function Kpi({ label, value, pct, variant, highlight }: { label: string; value: number; pct?: number; variant?: "destructive"; highlight?: boolean }) {
  return (
    <div className={cn(
      "rounded-lg p-3 border bg-card",
      highlight && "bg-[#53BDEB]/10 border-[#53BDEB]/40",
      variant === "destructive" && "bg-destructive/5 border-destructive/30",
    )}>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={cn("text-xl font-bold", variant === "destructive" && "text-destructive")}>{value}</div>
      {pct !== undefined && <div className="text-[10px] text-muted-foreground">{pct}%</div>}
    </div>
  );
}

function JobStatusBadge({ j }: { j: any }) {
  if (j.read_at) return <Badge className="bg-[#53BDEB] text-white text-[10px]">Lu</Badge>;
  if (j.delivered_at) return <Badge className="bg-emerald-500 text-white text-[10px]">Livré</Badge>;
  if (j.sent_at) return <Badge className="bg-emerald-600 text-white text-[10px]">Envoyé</Badge>;
  if (j.status === "failed") return <Badge variant="destructive" className="text-[10px]">Échec</Badge>;
  if (j.status === "skipped") return <Badge variant="outline" className="text-[10px]">Ignoré</Badge>;
  if (j.status === "sending") return <Badge className="bg-blue-500 text-white text-[10px]">Envoi…</Badge>;
  return <Badge variant="outline" className="text-[10px]">En file</Badge>;
}

/* ============================================================
   CONTACTS TAB
   ============================================================ */
function ContactsTab({
  d, onAdd, onImport,
}: { d: ReturnType<typeof useWaDiffusion>; onAdd: () => void; onImport: () => void }) {
  const [q, setQ] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const filtered = useMemo(() => d.contacts.filter(c => {
    if (!showArchived && c.archived) return false;
    if (!q) return true;
    const s = q.toLowerCase();
    return c.display_name?.toLowerCase().includes(s) || c.phone_e164.includes(s);
  }), [d.contacts, q, showArchived]);

  return (
    <div className="p-4 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <button onClick={onAdd}
          className="flex items-center justify-center gap-2 h-12 rounded-xl bg-[hsl(165_91%_18%)] text-white font-semibold active:opacity-90">
          <Plus className="h-5 w-5" /> Ajouter
        </button>
        <button onClick={onImport}
          className="flex items-center justify-center gap-2 h-12 rounded-xl border-2 border-[hsl(165_91%_18%)] text-[hsl(165_91%_18%)] font-semibold active:bg-emerald-50">
          <Upload className="h-5 w-5" /> Importer
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher nom ou numéro…" className="h-11 pl-9" />
      </div>

      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-xs">
          <Switch checked={showArchived} onCheckedChange={setShowArchived} />
          Voir archives
        </label>
        <Button size="sm" variant="outline" onClick={() => {
          const ids = filtered.filter(c => c.is_whatsapp === null || c.is_whatsapp === undefined).map(c => c.id);
          if (!ids.length) { toast.info("Tous vérifiés"); return; }
          d.verifyContacts(ids);
        }}>
          <ShieldCheck className="h-4 w-4 mr-1" />Vérifier WA
        </Button>
      </div>

      <div className="text-xs text-muted-foreground">{filtered.length} contact(s)</div>

      {filtered.length === 0 ? (
        <EmptyState icon={Users} title="Aucun contact" desc="Ajoutez un numéro ou importez-en plusieurs." />
      ) : (
        <div className="divide-y border rounded-xl bg-card">
          {filtered.map(c => (
            <ContactRow key={c.id} c={c} d={d} />
          ))}
        </div>
      )}
    </div>
  );
}

function ContactRow({ c, d }: { c: any; d: ReturnType<typeof useWaDiffusion> }) {
  const [actions, setActions] = useState(false);
  return (
    <>
      <button onClick={() => setActions(true)} className="w-full flex items-center gap-3 p-3 text-left active:bg-muted/40">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate flex items-center gap-1.5 flex-wrap">
            {c.display_name || "—"}
            {c.is_whatsapp === true && <Badge className="bg-green-500 text-white text-[10px] gap-0.5"><CheckCircle2 className="h-3 w-3" />WA</Badge>}
            {c.is_whatsapp === false && <Badge variant="destructive" className="text-[10px] gap-0.5"><XCircle className="h-3 w-3" />Pas WA</Badge>}
            {(c.is_whatsapp === null || c.is_whatsapp === undefined) && <Badge variant="outline" className="text-[10px] gap-0.5"><HelpCircle className="h-3 w-3" />?</Badge>}
            {c.opt_out && <Badge variant="destructive" className="text-[10px]">OPT-OUT</Badge>}
            {c.archived && <Badge variant="outline" className="text-[10px]">Archivé</Badge>}
          </div>
          <div className="text-[11px] text-muted-foreground font-mono">{c.phone_e164}</div>
        </div>
        <MoreVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      <Sheet open={actions} onOpenChange={(v) => !v && setActions(false)}>
        <SheetContent side="bottom" className="p-0 rounded-t-2xl">
          <div className="px-4 pt-3 pb-2 border-b">
            <div className="font-semibold truncate">{c.display_name || c.phone_e164}</div>
            <div className="text-[11px] text-muted-foreground font-mono">{c.phone_e164}</div>
          </div>
          <div className="py-1 divide-y" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
            <SheetItem icon={ShieldCheck} label="Vérifier sur WhatsApp" onClick={() => { setActions(false); d.verifyContacts([c.id]); }} />
            <SheetItem icon={Ban} label={c.opt_out ? "Réactiver (opt-in)" : "Marquer opt-out"} onClick={() => { setActions(false); d.toggleOptOut(c.id, !c.opt_out); }} />
            <SheetItem icon={Archive} label={c.archived ? "Désarchiver" : "Archiver"} onClick={() => { setActions(false); d.toggleArchive(c.id, !c.archived); }} />
            <SheetItem icon={Trash2} label="Supprimer" danger onClick={() => { setActions(false); if (confirm("Supprimer ce contact ?")) d.removeContact(c.id); }} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function SheetItem({ icon: I, label, onClick, danger }: any) {
  return (
    <button onClick={onClick} className={cn(
      "w-full flex items-center gap-3 px-4 py-4 text-left active:bg-muted",
      danger && "text-destructive",
    )}>
      <I className="h-5 w-5 shrink-0" />
      <span className="text-[15px]">{label}</span>
    </button>
  );
}

/* ============================================================
   CONTACT ADD SCREEN (native)
   ============================================================ */
function ContactAddScreen({ d, onClose }: { d: ReturnType<typeof useWaDiffusion>; onClose: () => void }) {
  const [countryCode, setCountryCode] = useState("BJ");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const current = COUNTRIES.find(c => c.code === countryCode) || COUNTRIES[0];
  const countryOptions = COUNTRIES.map(c => `${c.flag} ${c.dial} ${c.name}`);
  const currentLabel = `${current.flag} ${current.dial} ${current.name}`;

  const save = async () => {
    if (!phone.trim()) { toast.error("Numéro requis"); return; }
    setSaving(true);
    try {
      await d.addContact({ phone, display_name: name || undefined, countryCode });
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <NativeScreen
      title="Ajouter un contact" onBack={onClose}
      footer={
        <Button onClick={save} disabled={saving} className="w-full h-12 bg-[hsl(165_91%_18%)] text-base font-semibold">
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Enregistrer
        </Button>
      }
    >
      <Field label="Pays">
        <NativeSelectSheet
          label="Pays"
          value={currentLabel}
          onChange={(label) => {
            const idx = countryOptions.indexOf(label);
            if (idx >= 0) setCountryCode(COUNTRIES[idx].code);
          }}
          options={countryOptions}
        />
      </Field>

      <Field label="Numéro WhatsApp">
        <div className="flex h-12 rounded-lg border bg-background overflow-hidden">
          <div className="flex items-center px-3 bg-muted/40 border-r text-sm font-medium gap-1.5">
            <span>{current.flag}</span><span>{current.dial}</span>
          </div>
          <Input
            type="tel" inputMode="numeric" autoComplete="tel"
            value={phone} onChange={e => setPhone(e.target.value)}
            placeholder={countryCode === "BJ" ? "01 XX XX XX XX (ou 8 chiffres)" : `${current.name} sans indicatif`}
            className="flex-1 border-0 h-full focus-visible:ring-0 focus-visible:ring-offset-0 text-base"
          />
        </div>
        {countryCode === "BJ" && (
          <p className="text-[11px] text-muted-foreground mt-1">
            Bénin : 8 chiffres (ancien) ou 10 chiffres avec 01 (nouveau). Les deux sont acceptés et vérifiés.
          </p>
        )}
      </Field>

      <Field label="Nom (optionnel)">
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Aïssa Dossou" className="h-12 text-base" />
      </Field>

      <Button onClick={save} disabled={saving} className="w-full h-12 bg-[hsl(165_91%_18%)] text-base font-semibold mt-2">
        {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Enregistrer le contact
      </Button>
    </NativeScreen>
  );

}

/* ============================================================
   CONTACT IMPORT SCREEN (native)
   ============================================================ */
function ContactImportScreen({ d, onClose }: { d: ReturnType<typeof useWaDiffusion>; onClose: () => void }) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const preview = useMemo(() => {
    if (!text.trim()) return { valid: [], invalid: 0 };
    const lines = text.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
    const valid: { phone: string; name?: string }[] = []; let invalid = 0;
    for (const line of lines) {
      const m = line.match(/^(.*?)([\+\d][\d\s.\-]+)$/);
      const phone = m?.[2]?.trim() ?? line;
      const name = m?.[1]?.trim() || undefined;
      const n = normalizeBeninWhatsApp(phone);
      if (n.valid) valid.push({ phone, name }); else invalid++;
    }
    return { valid, invalid };
  }, [text]);

  const submit = async () => {
    setSaving(true);
    try {
      const r = await d.bulkAdd(preview.valid);
      toast.success(`${r?.added ?? 0} ajoutés · ${r?.dup ?? 0} doublons · ${r?.invalid ?? 0} invalides`);
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <NativeScreen
      title="Importer des contacts" subtitle="Bénin 🇧🇯 · WhatsApp" onBack={onClose}
      footer={
        <Button onClick={submit} disabled={saving || preview.valid.length === 0}
          className="w-full h-12 bg-[hsl(165_91%_18%)] text-base font-semibold">
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Importer {preview.valid.length}
        </Button>
      }
    >
      <p className="text-sm text-muted-foreground">
        Collez un numéro par ligne, ou « Nom +229XXX ». Bénin : 8 chiffres ou 10 chiffres (avec 01).
      </p>
      <Textarea rows={10} value={text} onChange={e => setText(e.target.value)}
        placeholder={"Aïssa +22901XX XX XX XX\n+229XXXXXXXX\nKofi 0197123456"}
        className="text-base font-mono" />
      <div className="flex gap-2">
        <Badge>{preview.valid.length} valides</Badge>
        <Badge variant="destructive">{preview.invalid} invalides</Badge>
      </div>

      <Button onClick={submit} disabled={saving || preview.valid.length === 0}
        className="w-full h-12 bg-[hsl(165_91%_18%)] text-base font-semibold mt-2">
        {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Importer {preview.valid.length} contact(s)
      </Button>
    </NativeScreen>
  );
}


/* ============================================================
   SESSIONS TAB
   ============================================================ */
function SessionsTab({
  s, onOpen,
}: { s: ReturnType<typeof useDiffusionSessions>; onOpen: (row: DiffSession | null) => void }) {
  const renderRow = (row: DiffSession) => {
    const connected = row.status === "WORKING" || row.status === "connected";
    return (
      <button key={row.id} onClick={() => onOpen(row)}
        className="w-full flex items-center gap-3 p-3 text-left active:bg-muted/40">
        <Smartphone className={cn("h-5 w-5 shrink-0", connected ? "text-emerald-600" : "text-muted-foreground")} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium flex items-center gap-1.5 flex-wrap">
            {row.session_name}
            {row.is_admin_shared && <Badge variant="secondary" className="text-[10px]"><Share2 className="h-3 w-3 mr-0.5" />Partagée</Badge>}
            {connected
              ? <Badge className="bg-emerald-500 text-white text-[10px]">Connectée</Badge>
              : <Badge variant="outline" className="text-[10px]">{row.status}</Badge>}
          </div>
          <div className="text-[11px] text-muted-foreground font-mono">{row.phone_number ?? "— non renseigné —"}</div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </button>
    );
  };

  return (
    <div className="p-4 space-y-3">
      <button onClick={() => onOpen(null)}
        className="w-full flex items-center justify-center gap-2 h-12 rounded-xl bg-[hsl(165_91%_18%)] text-white font-semibold active:opacity-90">
        <Plus className="h-5 w-5" /> Nouvelle session WhatsApp
      </button>

      <div>
        <div className="text-xs font-semibold text-muted-foreground uppercase mb-1.5">Mes sessions ({s.mine.length})</div>
        {s.mine.length === 0 ? (
          <EmptyState icon={Smartphone} title="Aucune session" desc='Cliquez sur "Nouvelle session" pour scanner un QR.' />
        ) : (
          <div className="divide-y border rounded-xl bg-card">{s.mine.map(renderRow)}</div>
        )}
      </div>




      <p className="text-[11px] text-muted-foreground border-t pt-2">
        💡 Une session = un téléphone WhatsApp scanné. Vos campagnes l'utilisent pour envoyer.
      </p>
    </div>
  );
}

/* ============================================================
   SESSION FORM SCREEN (native + QR)
   ============================================================ */
const SESSION_ACTIVE = new Set(["WORKING", "connected"]);
function SessionFormScreen({ session, onClose }: { session: DiffSession | null; onClose: () => void }) {
  const { user } = useMobileAuth();
  const { isAdmin } = useAdminRole();
  const waha = useWAHADashboard();
  const [name, setName] = useState(session?.session_name ?? "");
  const [phone, setPhone] = useState(session?.phone_number ?? "");
  const [isShared, setIsShared] = useState(session?.is_admin_shared ?? false);
  const [status, setStatus] = useState<string>(session?.status ?? "disconnected");
  const [qr, setQr] = useState<string | null>(session?.qr_code ?? null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!name) return;
    const live = waha.sessions.find(x => x.name === name);
    if (live && live.status !== status) {
      setStatus(live.status);
      if (session?.id) supabase.from("whatsapp_accounts").update({ status: live.status, last_activity: new Date().toISOString() }).eq("id", session.id).then(() => {});
      if (SESSION_ACTIVE.has(live.status)) setQr(null);
    }
  }, [waha.sessions, name, status, session?.id]);

  const loadQr = async () => {
    if (!name) return;
    if (SESSION_ACTIVE.has(status)) { toast.info("Session déjà connectée"); return; }
    setBusy(true);
    try {
      const d = await waha.getQRCode(name);
      if (d?.qr) setQr(d.qr); else toast.info("QR indisponible");
    } catch (e: any) { toast.error(e.message || "Erreur QR"); }
    finally { setBusy(false); }
  };

  const refreshStatus = async () => {
    if (!name) return;
    setBusy(true);
    try {
      await waha.refreshSessions();
      const live = waha.sessions.find(x => x.name === name);
      if (live) setStatus(live.status);
    } finally { setBusy(false); }
  };

  const saveAndStart = async () => {
    if (!user) return;
    if (!name.trim()) { toast.error("Nom de session requis"); return; }
    let phoneE164: string | null = null;
    if (phone.trim()) {
      const n = normalizeBeninWhatsApp(phone);
      if (!n.valid) { toast.error("Numéro Bénin invalide"); return; }
      phoneE164 = n.e164_10 || n.e164_8 || null;
    }
    setBusy(true);
    try {
      let row = session;
      if (!row) {
        const ins = await supabase.from("whatsapp_accounts").insert({
          user_id: user.id, session_name: name.trim(), phone_number: phoneE164,
          status: "disconnected", is_admin_shared: isAdmin && isShared,
        }).select().single();
        if (ins.error) throw ins.error;
        row = ins.data as any;
      } else {
        const upd = await supabase.from("whatsapp_accounts").update({
          session_name: name.trim(), phone_number: phoneE164,
          is_admin_shared: isAdmin ? isShared : row.is_admin_shared,
        }).eq("id", row.id).select().single();
        if (upd.error) throw upd.error;
        row = upd.data as any;
      }
      try { await waha.createSession(name.trim()); } catch {}
      try { await waha.startSession(name.trim()); } catch {}
      await waha.refreshSessions();
      const live = waha.sessions.find(x => x.name === name.trim());
      if (live) setStatus(live.status);
      if (!live || !SESSION_ACTIVE.has(live.status)) setTimeout(loadQr, 1500);
      toast.success(`Session « ${name} » prête`);
    } catch (e: any) { toast.error(e.message || "Erreur"); }
    finally { setBusy(false); }
  };

  const stop = async () => {
    setBusy(true);
    try { await waha.stopSession(name); setStatus("STOPPED"); setQr(null); }
    catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const remove = async () => {
    if (!session) return;
    if (!confirm(`Supprimer la session « ${session.session_name} » ?`)) return;
    setBusy(true);
    try {
      try { await waha.deleteSession(session.session_name); } catch {}
      await supabase.from("whatsapp_accounts").delete().eq("id", session.id);
      toast.success("Session supprimée");
      onClose();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const isConnected = SESSION_ACTIVE.has(status);

  return (
    <NativeScreen
      title={session ? "Configurer la session" : "Nouvelle session"}
      subtitle={isConnected ? "Connectée ✓" : status}
      onBack={onClose}
      footer={
        <Button onClick={saveAndStart} disabled={busy} className="w-full h-12 bg-[hsl(165_91%_18%)] text-base font-semibold">
          {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Power className="h-4 w-4 mr-2" />}
          {session ? "Enregistrer & redémarrer" : "Créer & démarrer"}
        </Button>
      }
    >
      <Field label="Nom de la session">
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Diffusion-Promo" className="h-12 text-base"
          disabled={!!session && session.is_admin_shared && !isAdmin} />
        <p className="text-[11px] text-muted-foreground mt-1">Identifiant unique côté WAHA. Sans espace ni accent.</p>
      </Field>

      <Field label="Numéro WhatsApp 🇧🇯 (optionnel)">
        <div className="flex h-12 rounded-lg border bg-background overflow-hidden">
          <div className="flex items-center px-3 bg-muted/40 border-r text-sm font-medium">+229</div>
          <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="01 XX XX XX XX"
            className="flex-1 border-0 h-full focus-visible:ring-0 focus-visible:ring-offset-0 text-base" inputMode="numeric" />
        </div>
      </Field>

      {isAdmin && (
        <label className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-amber-50">
          <span className="text-sm">Session partagée admin (visible par tous)</span>
          <Switch checked={isShared} onCheckedChange={setIsShared} />
        </label>
      )}

      <div className="rounded-xl border bg-muted/20 p-4 flex flex-col items-center justify-center min-h-[260px]">
        {isConnected ? (
          <div className="text-center text-sm">
            <CheckCircle2 className="h-14 w-14 mx-auto mb-2 text-emerald-600" />
            <div className="font-semibold text-emerald-700">WhatsApp connecté</div>
            <div className="text-muted-foreground mt-1">Vous pouvez lancer vos campagnes.</div>
          </div>
        ) : busy && !qr ? (
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        ) : qr ? (
          <img src={qr.startsWith("data:") ? qr : `data:image/png;base64,${qr}`} alt="QR" className="max-w-full max-h-64" />
        ) : (
          <div className="text-center text-sm text-muted-foreground">
            <QrCode className="h-12 w-12 mx-auto mb-2 opacity-50" />
            Démarrez la session, puis affichez le QR pour scanner avec WhatsApp.
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={loadQr} disabled={busy || !name || isConnected} className="h-11">
          <QrCode className="h-4 w-4 mr-1" /> QR
        </Button>
        <Button variant="outline" onClick={refreshStatus} disabled={busy || !name} className="h-11">
          <RefreshCw className="h-4 w-4 mr-1" /> Statut
        </Button>
        {session && (
          <>
            <Button variant="outline" onClick={stop} disabled={busy} className="h-11">Arrêter</Button>
            <Button variant="destructive" onClick={remove} disabled={busy} className="h-11">
              <Trash2 className="h-4 w-4 mr-1" /> Supprimer
            </Button>
          </>
        )}
      </div>
    </NativeScreen>
  );
}

/* ============================================================
   STATS TAB
   ============================================================ */
function StatsTab({ d }: { d: ReturnType<typeof useWaDiffusion> }) {
  const totals = d.campaigns.reduce((acc, c) => {
    acc.total += c.stats?.total ?? 0;
    acc.sent += c.stats?.sent ?? 0;
    acc.delivered += c.stats?.delivered ?? 0;
    acc.read += c.stats?.read ?? 0;
    acc.failed += c.stats?.failed ?? 0;
    return acc;
  }, { total: 0, sent: 0, delivered: 0, read: 0, failed: 0 });

  return (
    <div className="p-4 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Kpi label="Contacts" value={d.contacts.length} />
        <Kpi label="Campagnes" value={d.campaigns.length} />
        <Kpi label="Cibles totales" value={totals.total} />
        <Kpi label="Envoyés" value={totals.sent} />
        <Kpi label="Livrés" value={totals.delivered} />
        <Kpi label="Lus" value={totals.read} highlight />
        <Kpi label="Échecs" value={totals.failed} variant="destructive" />
      </div>
      <Button variant="outline" onClick={() => d.refresh()} className="w-full h-11">
        <RefreshCw className="h-4 w-4 mr-1" /> Actualiser
      </Button>

      <div className="pt-4 border-t">
        <DiffusionTrackingDashboard />
      </div>
    </div>
  );
}


/* ============================================================
   SHARED HELPERS
   ============================================================ */
function Field({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div>
      {label && <label className="text-sm font-medium block mb-1.5">{label}</label>}
      {children}
    </div>
  );
}

function EmptyState({ icon: I, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="text-center py-12">
      <I className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
      <div className="font-medium">{title}</div>
      <p className="text-sm text-muted-foreground mt-1">{desc}</p>
    </div>
  );
}
