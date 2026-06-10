import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Shield, ShieldOff, Clock, Pause, Play, AlertTriangle, Loader2, ListChecks, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Settings = {
  auto_enabled: boolean;
  auto_default_for_new_contacts: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  timezone: string;
  max_per_contact_per_day: number;
  max_total_per_day: number;
  pause_until: string | null;
};

type Stats = { sent_today: number; scheduled: number; opted_out: number; auto_on: number };

export default function RadarAutoControlPanel() {
  const [s, setS] = useState<Settings | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scheduledOpen, setScheduledOpen] = useState(false);
  const [scheduled, setScheduled] = useState<any[]>([]);

  const call = async (action: string, body: Record<string, unknown> = {}) => {
    const { data, error } = await supabase.functions.invoke("waouh-radar-auto-control", {
      body: { action, ...body },
    });
    if (error) throw new Error(error.message);
    if ((data as any)?.error) throw new Error((data as any).error);
    return data as any;
  };

  const load = async () => {
    setLoading(true);
    try {
      const r = await call("get_settings");
      setS(r.settings);
      setStats(r.stats);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const update = async (patch: Partial<Settings>) => {
    if (!s) return;
    setS({ ...s, ...patch });
    setSaving(true);
    try {
      const r = await call("update_settings", { patch });
      setS(r.settings);
      toast.success("Paramètres mis à jour");
    } catch (e: any) {
      toast.error(e.message);
      load();
    } finally {
      setSaving(false);
    }
  };

  const pause = async (minutes: number | null) => {
    try {
      if (minutes === null) {
        await call("update_settings", { patch: { auto_enabled: false } });
        toast.success("Messages auto désactivés");
      } else {
        await call("pause_now", { minutes });
        toast.success(`Pause ${minutes >= 1440 ? `${Math.round(minutes / 60 / 24)}j` : `${Math.round(minutes / 60)}h`}`);
      }
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const resume = async () => {
    try {
      await call("resume_now");
      toast.success("Messages auto repris");
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const openScheduled = async () => {
    setScheduledOpen(true);
    try {
      const r = await call("list_scheduled");
      setScheduled(r.items);
    } catch (e: any) { toast.error(e.message); }
  };

  const cancelAll = async () => {
    if (!confirm("Annuler tous les messages auto Radar IA programmés ?")) return;
    try {
      const r = await call("cancel_scheduled");
      toast.success(`${r.cancelled} message(s) annulé(s)`);
      openScheduled();
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  if (loading || !s) {
    return (
      <Card className="p-4 flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Chargement contrôle Radar IA…
      </Card>
    );
  }

  const isPaused = !s.auto_enabled || (s.pause_until && new Date(s.pause_until) > new Date());

  return (
    <Card className="p-4 space-y-4 border-2 border-cyan-500/30">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            {s.auto_enabled ? <Shield className="w-5 h-5 text-emerald-500" /> : <ShieldOff className="w-5 h-5 text-red-500" />}
            Contrôle des messages automatiques Radar IA
          </h3>
          <p className="text-xs text-muted-foreground">
            Pilote tous les outreach WhatsApp auto envoyés aux contacts détectés.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isPaused && (
            <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3 h-3" /> Arrêté</Badge>
          )}
          <Switch
            checked={s.auto_enabled}
            onCheckedChange={(v) => update({ auto_enabled: v, pause_until: v ? null : s.pause_until })}
            disabled={saving}
          />
          <span className="text-xs">{s.auto_enabled ? "Activé" : "Désactivé"}</span>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Card className="p-2 text-center"><div className="text-xs text-muted-foreground">Envoyés 24h</div><div className="text-xl font-bold text-emerald-600">{stats.sent_today}</div></Card>
          <Card className="p-2 text-center"><div className="text-xs text-muted-foreground">Programmés</div><div className="text-xl font-bold text-amber-500">{stats.scheduled}</div></Card>
          <Card className="p-2 text-center"><div className="text-xs text-muted-foreground">Auto activé</div><div className="text-xl font-bold">{stats.auto_on}</div></Card>
          <Card className="p-2 text-center"><div className="text-xs text-muted-foreground">Opt-out / bloqués</div><div className="text-xl font-bold text-red-500">{stats.opted_out}</div></Card>
        </div>
      )}

      {/* Pause controls */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-muted-foreground">Pause rapide :</span>
        <Button size="sm" variant="outline" onClick={() => pause(60)}><Pause className="w-3.5 h-3.5 mr-1" /> 1h</Button>
        <Button size="sm" variant="outline" onClick={() => pause(60 * 24)}><Pause className="w-3.5 h-3.5 mr-1" /> 24h</Button>
        <Button size="sm" variant="outline" onClick={() => pause(null)}><ShieldOff className="w-3.5 h-3.5 mr-1" /> Indéfinie</Button>
        <Button size="sm" variant="default" onClick={resume}><Play className="w-3.5 h-3.5 mr-1" /> Reprendre</Button>
        {s.pause_until && new Date(s.pause_until) > new Date() && (
          <Badge variant="outline" className="text-xs">jusqu'au {new Date(s.pause_until).toLocaleString("fr-FR")}</Badge>
        )}
      </div>

      {/* Quiet hours + caps */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <Label className="text-xs flex items-center gap-1"><Clock className="w-3 h-3" /> Début silence</Label>
          <Input type="time" value={s.quiet_hours_start?.slice(0, 5)} onChange={(e) => update({ quiet_hours_start: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs flex items-center gap-1"><Clock className="w-3 h-3" /> Fin silence</Label>
          <Input type="time" value={s.quiet_hours_end?.slice(0, 5)} onChange={(e) => update({ quiet_hours_end: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Max / contact / jour</Label>
          <Input type="number" min={1} value={s.max_per_contact_per_day} onChange={(e) => update({ max_per_contact_per_day: Math.max(1, Number(e.target.value)) })} />
        </div>
        <div>
          <Label className="text-xs">Max total / jour</Label>
          <Input type="number" min={1} value={s.max_total_per_day} onChange={(e) => update({ max_total_per_day: Math.max(1, Number(e.target.value)) })} />
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Switch
            checked={s.auto_default_for_new_contacts}
            onCheckedChange={(v) => update({ auto_default_for_new_contacts: v })}
            disabled={saving}
          />
          <Label className="text-xs cursor-pointer">Auto-notify par défaut pour nouveaux contacts</Label>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={openScheduled}>
            <ListChecks className="w-3.5 h-3.5 mr-1" /> Voir programmés
          </Button>
          <Button size="sm" variant="destructive" onClick={cancelAll}>
            <Trash2 className="w-3.5 h-3.5 mr-1" /> Annuler programmés
          </Button>
        </div>
      </div>

      <Dialog open={scheduledOpen} onOpenChange={setScheduledOpen}>
        <DialogContent className="max-w-2xl max-h-[80dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Messages auto Radar IA programmés ({scheduled.length})</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            {scheduled.length === 0 && <p className="text-muted-foreground text-center py-6">Aucun message programmé.</p>}
            {scheduled.map((m) => (
              <Card key={m.id} className="p-2 text-xs">
                <div className="font-mono">+{m.to_phone}</div>
                <div className="text-muted-foreground">{m.template} · {m.event_type}</div>
                <div className="text-muted-foreground">Programmé : {m.scheduled_at ? new Date(m.scheduled_at).toLocaleString("fr-FR") : "dès que possible"}</div>
              </Card>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduledOpen(false)}>Fermer</Button>
            <Button variant="destructive" onClick={cancelAll}>Tout annuler</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
