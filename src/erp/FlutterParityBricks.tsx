import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Bot,
  CheckCircle2,
  ChevronRight,
  Loader2,
  MapPin,
  Megaphone,
  MessageSquareText,
  Package,
  Play,
  Plus,
  QrCode,
  RefreshCw,
  Send,
  Smartphone,
  Sparkles,
  Square,
  Users,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useMobileAuth } from '@/app-mobile/hooks/useMobileAuth';
import { useWAHADashboard, type WAHASession } from '@/hooks/useWAHADashboard';
import { useWaDiffusion } from '@/hooks/useWaDiffusion';
import { useDiffusionSessions } from '@/hooks/useDiffusionSessions';
import AudienceBuilder from '@/components/diffusion/AudienceBuilder';
import DiffusionTrackingDashboard from '@/components/diffusion/DiffusionTrackingDashboard';
import { AgentsSection } from '@/components/whatsapp/agents/AgentsSection';
import { cn } from '@/lib/utils';

type QuickAgent = {
  id: string;
  label: string;
  desc: string;
  icon: typeof MessageSquareText;
  route: string;
  color: string;
};

const QUICK_AGENTS: QuickAgent[] = [
  {
    id: 'conversational',
    label: 'Conversationnel',
    desc: 'WhatsApp, vente, RDV et relance automatique',
    icon: MessageSquareText,
    route: '/app/bots/new',
    color: 'from-emerald-500 to-teal-600',
  },
  {
    id: 'bi',
    label: 'BI / Analyse',
    desc: 'Google Sheet, Excel, CSV, API et décision IA',
    icon: BarChart3,
    route: '/app/agents/bi/new',
    color: 'from-blue-500 to-indigo-600',
  },
  {
    id: 'stock',
    label: 'Gestion stock',
    desc: 'Produits, alertes, réapprovisionnement intelligent',
    icon: Package,
    route: '/app/agents/stock/new',
    color: 'from-amber-500 to-orange-600',
  },
  {
    id: 'attendance',
    label: 'Présence QR',
    desc: 'Check-in géolocalisé et notification WhatsApp',
    icon: MapPin,
    route: '/app/agents/attendance/new',
    color: 'from-fuchsia-500 to-pink-600',
  },
];

const statusMeta = (status?: string) => {
  switch (status) {
    case 'WORKING':
    case 'connected':
      return { label: 'Connecté', className: 'bg-emerald-500 text-white', icon: CheckCircle2 };
    case 'SCAN_QR_CODE':
      return { label: 'Scanner le QR', className: 'bg-amber-500 text-white', icon: QrCode };
    case 'STARTING':
      return { label: 'Démarrage…', className: 'bg-blue-500 text-white', icon: Loader2 };
    case 'FAILED':
      return { label: 'Échec', className: 'bg-red-500 text-white', icon: Square };
    case 'STOPPED':
    default:
      return { label: status || 'Arrêtée', className: 'bg-slate-400 text-white', icon: Square };
  }
};

const BrickFrame = ({
  title,
  subtitle,
  icon: Icon,
  children,
  action,
}: {
  title: string;
  subtitle: string;
  icon: typeof Sparkles;
  children: React.ReactNode;
  action?: React.ReactNode;
}) => (
  <div className="h-full w-full overflow-y-auto bg-slate-50/60 p-5 md:p-7">
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <div className="flex flex-col gap-4 rounded-3xl border bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(165_91%_25%)] text-white shadow-sm">
            <Icon className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-950">{title}</h2>
            <p className="text-sm text-slate-500">{subtitle}</p>
          </div>
        </div>
        {action}
      </div>
      {children}
    </div>
  </div>
);

export function WhatsAppFlutterParityBrick() {
  const { user } = useMobileAuth();
  const {
    sessions,
    loading,
    createSession,
    startSession,
    stopSession,
    refreshData,
  } = useWAHADashboard();
  const [dbSessions, setDbSessions] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const loadDb = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('whatsapp_accounts')
      .select('id, session_name, status, phone_number, user_id, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setDbSessions(data ?? []);
  };

  useEffect(() => {
    void loadDb();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const merged: WAHASession[] = useMemo(() => {
    const allowed = new Set(dbSessions.map((d) => d.session_name));
    const map = new Map<string, WAHASession>();
    for (const db of dbSessions) {
      map.set(db.session_name, {
        name: db.session_name,
        status: (db.status as any) || 'STOPPED',
        server: 'WAHA',
        config: { metadata: { phone_number: db.phone_number ?? undefined } },
      });
    }
    for (const live of sessions) {
      if (!allowed.has(live.name)) continue;
      const prev = map.get(live.name);
      map.set(live.name, { ...prev, ...live, config: { ...prev?.config, ...live.config } });
    }
    return Array.from(map.values());
  }, [dbSessions, sessions]);

  const refresh = async () => {
    await Promise.all([refreshData(), loadDb()]);
  };

  const quickCreate = async () => {
    if (!user?.id) return;
    const name = `session-${Date.now().toString().slice(-6)}`;
    setBusy(name);
    try {
      await createSession(name);
      await supabase.from('whatsapp_accounts').upsert(
        { user_id: user.id, session_name: name, status: 'disconnected' },
        { onConflict: 'user_id,session_name' },
      );
      await loadDb();
      await startSession(name).catch(() => undefined);
    } finally {
      setBusy(null);
    }
  };

  return (
    <BrickFrame
      title="WhatsApp IA"
      subtitle="Même parcours que Flutter : sessions, QR, test, liaison bot et suivi WAHA."
      icon={Smartphone}
      action={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={refresh} disabled={loading}>
            <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} /> Synchroniser
          </Button>
          <Button className="bg-[#25D366] hover:bg-[#1da851]" onClick={quickCreate} disabled={!!busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Nouvelle session
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><QrCode className="h-5 w-5 text-amber-500" /> QR WhatsApp</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Créez ou démarrez une session, puis scannez le QR depuis WhatsApp → Appareils connectés.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Bot className="h-5 w-5 text-emerald-600" /> Agent IA lié</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Chaque session peut être reliée à un agent pour répondre automatiquement selon votre catalogue.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Send className="h-5 w-5 text-blue-600" /> Message test</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Une fois connecté, testez l’envoi et vérifiez le webhook avant exploitation.
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-lg">
            <span>Sessions WhatsApp IA</span>
            <Badge variant="secondary">{merged.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && merged.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Chargement…
            </div>
          ) : merged.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-8 text-center">
              <Smartphone className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="font-medium">Aucune session WhatsApp IA</p>
              <p className="mt-1 text-sm text-muted-foreground">Créez votre première session pour afficher le QR et connecter WhatsApp.</p>
              <Button className="mt-4 bg-[#25D366] hover:bg-[#1da851]" onClick={quickCreate}>
                <Plus className="mr-2 h-4 w-4" /> Créer ma première session
              </Button>
            </div>
          ) : (
            merged.map((session) => {
              const meta = statusMeta(session.status);
              const Icon = meta.icon;
              const phone = session.config?.metadata?.phone_number;
              const isWorking = session.status === 'WORKING' || session.status === 'connected';
              return (
                <div key={session.name} className="flex flex-col gap-3 rounded-2xl border bg-white p-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <strong className="truncate">{session.name}</strong>
                      <Badge className={cn(meta.className, 'gap-1')}><Icon className="h-3 w-3" /> {meta.label}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{phone ? `+${phone}` : 'Aucun numéro lié'} · serveur {session.server || 'WAHA'}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!isWorking ? (
                      <Button variant="outline" size="sm" onClick={() => startSession(session.name)}>
                        <Play className="mr-1 h-3.5 w-3.5" /> Démarrer
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => stopSession(session.name)}>
                        <Square className="mr-1 h-3.5 w-3.5" /> Arrêter
                      </Button>
                    )}
                    <Button size="sm" className="bg-amber-500 hover:bg-amber-600">
                      <QrCode className="mr-1 h-3.5 w-3.5" /> Scanner le QR
                    </Button>
                    <Button size="sm" variant="ghost"><ChevronRight className="h-4 w-4" /></Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </BrickFrame>
  );
}

type DiffusionTab = 'ia' | 'campaigns' | 'contacts' | 'sessions' | 'stats';

export function DiffusionFlutterParityBrick() {
  const d = useWaDiffusion();
  const s = useDiffusionSessions();
  const [tab, setTab] = useState<DiffusionTab>('ia');

  const tabs: Array<{ key: DiffusionTab; label: string; icon: typeof Sparkles }> = [
    { key: 'ia', label: 'Diffusion IA', icon: Sparkles },
    { key: 'campaigns', label: 'Campagnes', icon: Send },
    { key: 'contacts', label: 'Contacts', icon: Users },
    { key: 'sessions', label: 'Sessions', icon: Smartphone },
    { key: 'stats', label: 'Suivi', icon: BarChart3 },
  ];

  return (
    <BrickFrame
      title="Diffusion WhatsApp"
      subtitle="Même contenu que Flutter : IA, campagnes, contacts, sessions et suivi."
      icon={Megaphone}
      action={<Button variant="outline" onClick={() => d.refresh()}><RefreshCw className="mr-2 h-4 w-4" /> Actualiser</Button>}
    >
      <div className="flex flex-wrap gap-2 rounded-3xl border bg-[hsl(165_91%_18%)] p-2">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition',
              tab === key ? 'bg-white text-[hsl(165_91%_18%)]' : 'text-white/85 hover:bg-white/10',
            )}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {tab === 'ia' && (
        <Card><CardContent className="p-4"><AudienceBuilder onSubmitted={() => setTab('campaigns')} /></CardContent></Card>
      )}
      {tab === 'campaigns' && (
        <Card>
          <CardHeader><CardTitle className="flex items-center justify-between">Campagnes <Badge variant="secondary">{d.campaigns.length}</Badge></CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {s.all.length === 0 && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                <strong>Aucune session WhatsApp connectée.</strong> Configurez une session avant l’envoi.
              </div>
            )}
            {d.campaigns.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">Aucune campagne. Créez une campagne depuis Diffusion IA.</div>
            ) : (
              d.campaigns.map((campaign) => {
                const total = campaign.stats?.total ?? 0;
                const sent = campaign.stats?.sent ?? 0;
                const pct = total ? Math.round((sent / total) * 100) : 0;
                return (
                  <div key={campaign.id} className="rounded-2xl border bg-white p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div><strong>{campaign.name}</strong><p className="text-xs text-muted-foreground">{campaign.type} · {new Date(campaign.created_at).toLocaleString('fr-FR')}</p></div>
                      <Badge>{campaign.status}</Badge>
                    </div>
                    {total > 0 && <div className="mt-3"><Progress value={pct} /><p className="mt-1 text-xs text-muted-foreground">{sent}/{total} envoyés ({pct}%)</p></div>}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      )}
      {tab === 'contacts' && (
        <Card><CardHeader><CardTitle>Contacts</CardTitle></CardHeader><CardContent><div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">Contacts WhatsApp et audiences de diffusion gérés par le même backend que Flutter.</div></CardContent></Card>
      )}
      {tab === 'sessions' && (
        <Card>
          <CardHeader><CardTitle className="flex items-center justify-between">Sessions d’envoi <Badge variant="secondary">{s.all.length}</Badge></CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {s.all.length === 0 ? <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">Aucune session de diffusion configurée.</div> : s.all.map((row) => <div key={row.id} className="rounded-2xl border bg-white p-4"><strong>{row.label || row.session_name}</strong><p className="text-xs text-muted-foreground">{row.status || 'session'}</p></div>)}
          </CardContent>
        </Card>
      )}
      {tab === 'stats' && <DiffusionTrackingDashboard />}
    </BrickFrame>
  );
}

export function BotsFlutterParityBrick() {
  return (
    <BrickFrame
      title="Mes Bots"
      subtitle="Même contenu que Flutter : création d’agents IA et agents WhatsApp actifs. Les bases de connaissance ne sont plus affichées ici."
      icon={Bot}
      action={<Button className="bg-[hsl(165_91%_25%)] hover:bg-[hsl(165_91%_18%)]" onClick={() => { window.location.href = '/app/bots/new'; }}><Plus className="mr-2 h-4 w-4" /> Nouvel agent</Button>}
    >
      <Card>
        <CardHeader>
          <CardTitle>Créer un agent</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {QUICK_AGENTS.map((agent) => {
              const Icon = agent.icon;
              return (
                <button
                  key={agent.id}
                  onClick={() => { window.location.href = agent.route; }}
                  className={cn('rounded-2xl bg-gradient-to-br p-4 text-left text-white shadow-sm transition active:scale-[0.98]', agent.color)}
                >
                  <Icon className="mb-3 h-7 w-7" />
                  <div className="font-semibold">{agent.label}</div>
                  <div className="mt-1 text-xs leading-snug opacity-90">{agent.desc}</div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <AgentsSection />
    </BrickFrame>
  );
}
