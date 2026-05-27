import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Loader2, QrCode, RefreshCw, Power, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminRole } from '@/hooks/useAdminRole';
import { toast } from 'sonner';
import { normalizeBeninWhatsApp } from '@/lib/phone';
import type { DiffSession } from '@/hooks/useDiffusionSessions';

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const CHANNEL_IN_URL = `https://${PROJECT_ID}.supabase.co/functions/v1/waouh-channel-in`;

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  initial?: DiffSession | null;
}

export const WaSessionDialog: React.FC<Props> = ({ open, onClose, onSaved, initial }) => {
  const { user } = useAuth();
  const { isAdmin } = useAdminRole();
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

  const callWaha = async (action: string, payload?: any) => {
    const { data, error } = await supabase.functions.invoke('waouh-waha-control', {
      body: { action, session: name, ...payload },
    });
    if (error) throw new Error(error.message || 'Erreur WAHA');
    return data;
  };

  const refreshStatus = async () => {
    if (!name) return;
    try {
      const data = await callWaha('session-status');
      if (data?.status) {
        setStatus(data.status);
        await supabase.from('whatsapp_accounts').update({ status: data.status }).eq('id', initial?.id ?? '');
      }
    } catch (e: any) { /* silent */ }
  };

  const loadQr = async () => {
    setBusy(true);
    try {
      const data = await callWaha('get-qr');
      const img = data?.qr || data?.image;
      if (img) setQr(img);
      else toast.info(status === 'WORKING' ? 'Session déjà connectée' : 'QR indisponible');
    } catch (e: any) { toast.error(e.message); }
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

      // 2) Create + start WAHA session with webhook
      try {
        await callWaha('session-create', {
          config: { webhooks: [{ url: CHANNEL_IN_URL, events: ['message'] }] },
        });
      } catch (e) { /* may already exist */ }
      await callWaha('session-start');

      // 3) Try loading QR
      setTimeout(loadQr, 1500);
      toast.success(`Session « ${name} » prête. Scannez le QR.`);
      onSaved();
    } catch (e: any) {
      toast.error(e.message || 'Erreur');
    } finally {
      setBusy(false);
    }
  };

  const stop = async () => {
    setBusy(true);
    try { await callWaha('session-stop'); setQr(null); toast.success('Session arrêtée'); refreshStatus(); }
    catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const remove = async () => {
    if (!initial) return;
    if (!confirm(`Supprimer la session « ${initial.session_name} » ?`)) return;
    setBusy(true);
    try {
      try { await callWaha('session-stop'); } catch { /* ignore */ }
      await supabase.from('whatsapp_accounts').delete().eq('id', initial.id);
      toast.success('Session supprimée');
      onSaved(); onClose();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const statusColor = status === 'WORKING' || status === 'connected' ? 'bg-green-500' : status === 'SCAN_QR_CODE' ? 'bg-yellow-500' : 'bg-gray-400';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90dvh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {initial ? 'Configurer la session WAHA' : 'Nouvelle session WAHA'}
            <Badge className={statusColor + ' text-white'}>{status}</Badge>
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
              <Button variant="outline" onClick={loadQr} disabled={busy || !name}><QrCode className="w-4 h-4 mr-1" /> QR</Button>
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
            {busy && !qr ? <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              : qr ? <img src={qr.startsWith('data:') ? qr : `data:image/png;base64,${qr}`} alt="QR WhatsApp" className="max-w-full max-h-72" />
              : (
                <div className="text-center text-sm text-muted-foreground">
                  <QrCode className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  {status === 'WORKING' || status === 'connected'
                    ? 'Session connectée. Aucun QR nécessaire.'
                    : 'Lancez la session puis cliquez sur QR pour scanner avec WhatsApp.'}
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
