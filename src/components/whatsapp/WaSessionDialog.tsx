import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Loader2, QrCode, RefreshCw, Power, Trash2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminRole } from '@/hooks/useAdminRole';
import { toast } from 'sonner';
import { normalizeBeninWhatsApp } from '@/lib/phone';
import { useWAHADashboard } from '@/hooks/useWAHADashboard';
import type { DiffSession } from '@/hooks/useDiffusionSessions';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  initial?: DiffSession | null;
}

const ACTIVE = new Set(['WORKING', 'connected']);

export const WaSessionDialog: React.FC<Props> = ({ open, onClose, onSaved, initial }) => {
  const { user } = useAuth();
  const { isAdmin } = useAdminRole();
  const waha = useWAHADashboard();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isShared, setIsShared] = useState(false);
  const [status, setStatus] = useState<string>('disconnected');
  const [qr, setQr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setName(initial.session_name);
      setPhone(initial.phone_number ?? '');
      setIsShared(initial.is_admin_shared);
      setStatus(initial.status);
      setQr(initial.qr_code);
    } else {
      setName(''); setPhone(''); setIsShared(false); setStatus('disconnected'); setQr(null);
    }
  }, [open, initial]);

  // Sync live status from WAHA when dialog opens / sessions list refreshes
  useEffect(() => {
    if (!open || !name) return;
    const live = waha.sessions.find(s => s.name === name);
    if (live && live.status !== status) {
      setStatus(live.status);
      if (initial?.id) {
        supabase.from('whatsapp_accounts').update({ status: live.status, last_activity: new Date().toISOString() }).eq('id', initial.id).then(() => {});
      }
      if (ACTIVE.has(live.status)) setQr(null);
    }
  }, [open, name, waha.sessions, status, initial?.id]);

  const refreshStatus = async () => {
    if (!name) return;
    setBusy(true);
    try {
      await waha.refreshSessions();
      const live = waha.sessions.find(s => s.name === name);
      if (live) setStatus(live.status);
    } finally { setBusy(false); }
  };

  const loadQr = async () => {
    if (!name) return;
    if (ACTIVE.has(status)) { toast.info('Session déjà connectée — aucun QR nécessaire.'); return; }
    setBusy(true);
    try {
      const data = await waha.getQRCode(name);
      if (data?.qr) setQr(data.qr);
      else toast.info('QR indisponible');
    } catch (e: any) { toast.error(e.message || 'Erreur QR'); }
    finally { setBusy(false); }
  };

  const saveAndStart = async () => {
    if (!user) return;
    if (!name.trim()) { toast.error('Nom de session requis'); return; }
    let phoneE164: string | null = null;
    if (phone.trim()) {
      const n = normalizeBeninWhatsApp(phone);
      if (!n.valid) { toast.error('Numéro Bénin invalide'); return; }
      phoneE164 = n.e164_10 || n.e164_8 || null;
    }
    setBusy(true);
    try {
      // 1) Upsert row in DB
      let row = initial;
      if (!row) {
        const ins = await supabase.from('whatsapp_accounts').insert({
          user_id: user.id,
          session_name: name.trim(),
          phone_number: phoneE164,
          status: 'disconnected',
          is_admin_shared: isAdmin && isShared,
        }).select().single();
        if (ins.error) throw new Error(ins.error.message);
        row = ins.data as any;
      } else {
        const upd = await supabase.from('whatsapp_accounts').update({
          session_name: name.trim(),
          phone_number: phoneE164,
          is_admin_shared: isAdmin ? isShared : initial.is_admin_shared,
        }).eq('id', initial.id).select().single();
        if (upd.error) throw new Error(upd.error.message);
        row = upd.data as any;
      }

      // 2) Create + start WAHA session (idempotent — ignore "already exists")
      try { await waha.createSession(name.trim()); } catch { /* may already exist */ }
      try { await waha.startSession(name.trim()); } catch { /* may already running */ }

      // 3) Refresh status, attempt QR if not connected
      await waha.refreshSessions();
      const live = waha.sessions.find(s => s.name === name.trim());
      if (live) setStatus(live.status);
      if (!live || !ACTIVE.has(live.status)) {
        setTimeout(loadQr, 1500);
      }
      toast.success(`Session « ${name} » prête.`);
      onSaved();
    } catch (e: any) {
      toast.error(e.message || 'Erreur');
    } finally {
      setBusy(false);
    }
  };

  const stop = async () => {
    setBusy(true);
    try { await waha.stopSession(name); setQr(null); setStatus('STOPPED'); }
    catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const remove = async () => {
    if (!initial) return;
    if (!confirm(`Supprimer la session « ${initial.session_name} » ?`)) return;
    setBusy(true);
    try {
      try { await waha.deleteSession(initial.session_name); } catch { /* ignore */ }
      await supabase.from('whatsapp_accounts').delete().eq('id', initial.id);
      toast.success('Session supprimée');
      onSaved(); onClose();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const isConnected = ACTIVE.has(status);
  const statusColor = isConnected ? 'bg-green-500' : status === 'SCAN_QR_CODE' ? 'bg-yellow-500' : status === 'STARTING' ? 'bg-blue-500' : 'bg-gray-400';
  const statusLabel = isConnected ? 'Connecté ✓' : status;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90dvh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            {initial ? 'Configurer la session WAHA' : 'Nouvelle session WAHA'}
            <Badge className={statusColor + ' text-white'}>{statusLabel}</Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <Label>Nom de la session *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Diffusion-Promo" disabled={!!initial && initial.is_admin_shared && !isAdmin} />
              <p className="text-[11px] text-muted-foreground mt-1">Identifiant unique côté WAHA. Pas d'espaces ni d'accents.</p>
            </div>
            <div>
              <Label>Numéro WhatsApp 🇧🇯 (optionnel)</Label>
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 bg-muted text-sm">+229</span>
                <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="01 XX XX XX XX" className="rounded-l-none" />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Affiché pour vous aider à reconnaître la session.</p>
            </div>
            {isAdmin && (
              <div className="flex items-center gap-2 p-2 border rounded bg-amber-50">
                <Switch checked={isShared} onCheckedChange={setIsShared} id="shared" />
                <Label htmlFor="shared" className="text-sm">Session partagée admin (visible par tous)</Label>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              <Button onClick={saveAndStart} disabled={busy} className="bg-green-600 hover:bg-green-700">
                {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Power className="w-4 h-4 mr-1" />}
                {initial ? 'Enregistrer & redémarrer' : 'Créer & démarrer'}
              </Button>
              <Button variant="outline" onClick={loadQr} disabled={busy || !name || isConnected}><QrCode className="w-4 h-4 mr-1" /> QR</Button>
              <Button variant="outline" onClick={refreshStatus} disabled={busy || !name}><RefreshCw className="w-4 h-4 mr-1" /> Statut</Button>
              {initial && (
                <>
                  <Button variant="outline" onClick={stop} disabled={busy}>Arrêter</Button>
                  <Button variant="destructive" size="icon" onClick={remove} disabled={busy}><Trash2 className="w-4 h-4" /></Button>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col items-center justify-center p-4 bg-muted/30 rounded-lg min-h-[280px]">
            {isConnected ? (
              <div className="text-center text-sm">
                <CheckCircle2 className="w-14 h-14 mx-auto mb-2 text-green-600" />
                <div className="font-semibold text-green-700">Session WhatsApp connectée</div>
                <div className="text-muted-foreground mt-1">Aucun QR nécessaire. Vous pouvez lancer vos campagnes.</div>
              </div>
            ) : busy && !qr ? <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              : qr ? <img src={qr.startsWith('data:') ? qr : `data:image/png;base64,${qr}`} alt="QR WhatsApp" className="max-w-full max-h-72" />
              : (
                <div className="text-center text-sm text-muted-foreground">
                  <QrCode className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  Lancez la session puis cliquez sur QR pour scanner avec WhatsApp.
                </div>
              )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
