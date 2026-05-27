import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectGroup, SelectLabel, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Users, BarChart3, Plus, Trash2, Archive, Ban, Upload, Sparkles, Phone, Image as ImageIcon, Video, FileText, Play, RefreshCw, Settings, Smartphone, Share2, Eye, Pause, Copy, MoreVertical, ShieldCheck, CheckCircle2, XCircle, HelpCircle } from 'lucide-react';
import { useWaDiffusion } from '@/hooks/useWaDiffusion';
import { useDiffusionSessions, type DiffSession } from '@/hooks/useDiffusionSessions';
import { WaSessionDialog } from '@/components/whatsapp/WaSessionDialog';
import { CampaignDetailsDialog } from '@/components/whatsapp/CampaignDetailsDialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { COUNTRIES as PHONE_COUNTRIES } from '@/lib/phone';
import { normalizeBeninWhatsApp } from '@/lib/phone';

export const WhatsAppDiffusionV2: React.FC = () => {
  const d = useWaDiffusion();
  const s = useDiffusionSessions();
  const [tab, setTab] = useState('contacts');

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-2xl mx-auto">
          <TabsTrigger value="contacts"><Users className="w-4 h-4 mr-1.5" /> Contacts</TabsTrigger>
          <TabsTrigger value="campaigns"><Send className="w-4 h-4 mr-1.5" /> Campagnes</TabsTrigger>
          <TabsTrigger value="sessions"><Smartphone className="w-4 h-4 mr-1.5" /> Sessions</TabsTrigger>
          <TabsTrigger value="stats"><BarChart3 className="w-4 h-4 mr-1.5" /> Suivi</TabsTrigger>
        </TabsList>

        <TabsContent value="contacts" className="mt-4">
          <ContactsTab d={d} />
        </TabsContent>
        <TabsContent value="campaigns" className="mt-4">
          <CampaignsTab d={d} s={s} onGotoSessions={() => setTab('sessions')} />
        </TabsContent>
        <TabsContent value="sessions" className="mt-4">
          <SessionsTab s={s} />
        </TabsContent>
        <TabsContent value="stats" className="mt-4">
          <StatsTab d={d} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// ============ SESSIONS ============
const SessionsTab: React.FC<{ s: ReturnType<typeof useDiffusionSessions> }> = ({ s }) => {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DiffSession | null>(null);

  const openNew = () => { setEditing(null); setOpen(true); };
  const openEdit = (row: DiffSession) => { setEditing(row); setOpen(true); };

  const renderRow = (row: DiffSession) => {
    const connected = row.status === 'WORKING' || row.status === 'connected';
    return (
      <div key={row.id} className="border rounded-lg p-3 flex items-center gap-3 hover:bg-muted/30">
        <Smartphone className="w-5 h-5 text-green-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm flex items-center gap-2">
            {row.session_name}
            {row.is_admin_shared && <Badge variant="secondary" className="text-[10px]"><Share2 className="w-3 h-3 mr-0.5" />Partagée</Badge>}
            {connected && <Badge className="bg-green-500 text-white text-[10px]">connectée</Badge>}
            {!connected && <Badge variant="outline" className="text-[10px]">{row.status}</Badge>}
          </div>
          <div className="text-xs text-muted-foreground font-mono">{row.phone_number ?? '— numéro non renseigné —'}</div>
        </div>
        <Button size="sm" variant="outline" onClick={() => openEdit(row)}>
          <Settings className="w-4 h-4 mr-1" /> Configurer
        </Button>
      </div>
    );
  };

  return (
    <Card className="border-green-200">
      <CardHeader className="pb-3 flex flex-row justify-between items-center">
        <CardTitle className="flex items-center gap-2 text-green-700"><Smartphone className="w-5 h-5" /> Sessions WAHA</CardTitle>
        <Button className="bg-green-600 hover:bg-green-700" onClick={openNew}><Plus className="w-4 h-4 mr-1" /> Nouvelle session</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">Mes sessions ({s.mine.length})</div>
          {s.mine.length === 0 && (
            <div className="text-sm text-muted-foreground border border-dashed rounded p-4 text-center">
              Aucune session personnelle. Cliquez sur « Nouvelle session » pour scanner un QR WhatsApp.
            </div>
          )}
          <div className="space-y-2">{s.mine.map(renderRow)}</div>
        </div>

        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
            <Share2 className="w-3 h-3" /> Partagées par l'admin ({s.shared.length})
          </div>
          {s.shared.length === 0 && (
            <div className="text-sm text-muted-foreground border border-dashed rounded p-4 text-center">
              Aucune session partagée disponible pour l'instant.
            </div>
          )}
          <div className="space-y-2">{s.shared.map(renderRow)}</div>
        </div>

        <div className="text-[11px] text-muted-foreground border-t pt-2">
          💡 Une session = un téléphone WhatsApp scanné. Vos campagnes envoient les messages via la session choisie. Les sessions partagées (ex. WaouhApp) sont gérées par l'administrateur Bot Bj.
        </div>
      </CardContent>
      <WaSessionDialog open={open} onClose={() => setOpen(false)} onSaved={s.refresh} initial={editing} />
    </Card>
  );
};

// ============ CONTACTS ============
const ContactsTab: React.FC<{ d: ReturnType<typeof useWaDiffusion> }> = ({ d }) => {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [countryCode, setCountryCode] = useState('BJ');
  const [filter, setFilter] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const COUNTRIES = PHONE_COUNTRIES;
  const current = COUNTRIES.find(c => c.code === countryCode) || COUNTRIES[0];

  const filtered = useMemo(() => {
    return d.contacts.filter(c => {
      if (!showArchived && c.archived) return false;
      if (!filter) return true;
      const q = filter.toLowerCase();
      return (c.display_name?.toLowerCase().includes(q) || c.phone_e164.includes(q) || (c.tags ?? []).some(t => t.toLowerCase().includes(q)));
    });
  }, [d.contacts, filter, showArchived]);

  return (
    <Card className="border-green-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-green-700"><Users className="w-5 h-5" /> Mes contacts WhatsApp</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Ajout manuel */}
        <div className="flex flex-col sm:flex-row gap-2 items-end">
          <div className="flex-1">
            <Label className="text-xs">Numéro WhatsApp</Label>
            <div className="flex">
              <select
                value={countryCode}
                onChange={e => setCountryCode(e.target.value)}
                className="inline-flex items-center px-2 rounded-l-md border border-r-0 bg-muted text-sm h-10 focus:outline-none"
                title="Pays"
              >
                {COUNTRIES.map(c => (
                  <option key={c.code} value={c.code}>{c.flag} {c.dial} — {c.name}</option>
                ))}
              </select>
              <Input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder={countryCode === 'BJ' ? '01 XX XX XX XX' : `${current.name} sans indicatif`}
                className="rounded-l-none"
              />
            </div>
          </div>
          <div className="flex-1">
            <Label className="text-xs">Nom (optionnel)</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Aïssa Dossou" />
          </div>
          <Button className="bg-green-600 hover:bg-green-700"
            onClick={async () => { await d.addContact({ phone, display_name: name || undefined, countryCode }); setPhone(''); setName(''); }}>
            <Plus className="w-4 h-4 mr-1" /> Ajouter
          </Button>
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="w-4 h-4 mr-1" /> Importer
          </Button>
        </div>


        {/* Filtre + toggle archives + bouton vérifier */}
        <div className="flex gap-2 items-center flex-wrap">
          <Input placeholder="Rechercher (nom, numéro, tag)…" value={filter} onChange={e => setFilter(e.target.value)} className="flex-1 min-w-[180px]" />
          <div className="flex items-center gap-2">
            <Switch checked={showArchived} onCheckedChange={setShowArchived} id="arch" />
            <Label htmlFor="arch" className="text-xs">Archives</Label>
          </div>
          <Button
            size="sm" variant="outline"
            onClick={() => {
              const ids = filtered.filter(c => c.is_whatsapp === null || c.is_whatsapp === undefined).map(c => c.id);
              if (!ids.length) { toast.info('Tous les contacts filtrés sont déjà vérifiés'); return; }
              d.verifyContacts(ids);
            }}
          >
            <ShieldCheck className="w-4 h-4 mr-1" /> Vérifier WhatsApp
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          {filtered.length} contact(s) {d.contacts.filter(c => c.opt_out).length > 0 && `· ${d.contacts.filter(c => c.opt_out).length} opt-out`}
        </div>

        <ScrollArea className="h-[420px] border rounded-md">
          <div className="divide-y">
            {filtered.length === 0 && <div className="p-6 text-center text-muted-foreground text-sm">Aucun contact</div>}
            {filtered.map(c => (
              <div key={c.id} className="p-3 flex items-center gap-3 hover:bg-muted/40">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate flex items-center gap-2">
                    {c.display_name || '—'}
                    {c.is_whatsapp === true && <Badge className="bg-green-500 text-white text-[10px] gap-0.5"><CheckCircle2 className="w-3 h-3" />WhatsApp</Badge>}
                    {c.is_whatsapp === false && <Badge variant="destructive" className="text-[10px] gap-0.5"><XCircle className="w-3 h-3" />Pas WA</Badge>}
                    {(c.is_whatsapp === null || c.is_whatsapp === undefined) && <Badge variant="outline" className="text-[10px] gap-0.5"><HelpCircle className="w-3 h-3" />Non vérifié</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">{c.phone_e164}</div>
                  {c.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {c.tags.map(t => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
                    </div>
                  )}
                </div>
                {c.opt_out && <Badge variant="destructive" className="text-[10px]">OPT-OUT</Badge>}
                {c.archived && <Badge variant="outline" className="text-[10px]">Archivé</Badge>}
                <Button size="icon" variant="ghost" title="Vérifier WhatsApp" onClick={() => d.verifyContacts([c.id])}>
                  <ShieldCheck className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" title="Opt-out" onClick={() => d.toggleOptOut(c.id, !c.opt_out)}>
                  <Ban className={`w-4 h-4 ${c.opt_out ? 'text-destructive' : ''}`} />
                </Button>
                <Button size="icon" variant="ghost" title="Archiver" onClick={() => d.toggleArchive(c.id, !c.archived)}>
                  <Archive className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" title="Supprimer" onClick={() => d.removeContact(c.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} onImport={d.bulkAdd} />
    </Card>
  );
};

const ImportDialog: React.FC<{ open: boolean; onClose: () => void; onImport: (items: { phone: string; name?: string }[]) => Promise<any> }> = ({ open, onClose, onImport }) => {
  const [text, setText] = useState('');
  const preview = useMemo(() => {
    if (!text.trim()) return { valid: [], invalid: 0 };
    const lines = text.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
    const valid: { phone: string; name?: string }[] = []; let invalid = 0;
    for (const line of lines) {
      // détection "Nom +229XXX" ou juste numéro
      const m = line.match(/^(.*?)([\+\d][\d\s.\-]+)$/);
      const phone = m?.[2]?.trim() ?? line;
      const name = m?.[1]?.trim() || undefined;
      const n = normalizeBeninWhatsApp(phone);
      if (n.valid) valid.push({ phone, name }); else invalid++;
    }
    return { valid, invalid };
  }, [text]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90dvh] overflow-auto">
        <DialogHeader><DialogTitle>Importer des contacts WhatsApp</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Collez un numéro par ligne, ou "Nom +229XXX". Format accepté : 8 chiffres (01 préfixé auto) ou 10 chiffres avec 01.</p>
          <Textarea rows={10} value={text} onChange={e => setText(e.target.value)} placeholder={`Aïssa +22901XX XX XX XX\n+229XXXXXXXX\n...`} />
          <div className="text-sm flex gap-3">
            <Badge variant="default">{preview.valid.length} valides</Badge>
            <Badge variant="destructive">{preview.invalid} invalides</Badge>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button className="bg-green-600 hover:bg-green-700" disabled={preview.valid.length === 0}
            onClick={async () => {
              const r = await onImport(preview.valid);
              toast.success(`${r.added} ajoutés · ${r.dup} doublons · ${r.invalid} invalides`);
              setText(''); onClose();
            }}>
            Importer {preview.valid.length}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ============ CAMPAIGNS ============
const CampaignsTab: React.FC<{ d: ReturnType<typeof useWaDiffusion>; s: ReturnType<typeof useDiffusionSessions>; onGotoSessions: () => void }> = ({ d, s, onGotoSessions }) => {
  const [open, setOpen] = useState(false);

  return (
    <Card className="border-green-200">
      <CardHeader className="pb-3 flex flex-row justify-between items-center">
        <CardTitle className="flex items-center gap-2 text-green-700"><Send className="w-5 h-5" /> Campagnes</CardTitle>
        <Button className="bg-green-600 hover:bg-green-700" onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1" /> Nouvelle</Button>
      </CardHeader>
      <CardContent>
        {d.campaigns.length === 0 && <div className="text-center py-8 text-muted-foreground">Aucune campagne. Créez-en une.</div>}
        <div className="space-y-3">
          {d.campaigns.map(c => (
            <CampaignRow key={c.id} c={c} d={d} />
          ))}
        </div>
      </CardContent>
      <NewCampaignDialog open={open} onClose={() => setOpen(false)} d={d} s={s} onGotoSessions={onGotoSessions} />
    </Card>
  );
};

const CampaignRow: React.FC<{ c: any; d: any }> = ({ c, d }) => {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const total = c.stats?.total ?? 0;
  const sent = c.stats?.sent ?? 0;
  const failed = c.stats?.failed ?? 0;
  const pending = c.stats?.pending ?? (c.stats?.queued ?? 0) + (c.stats?.sending ?? 0);
  const pct = total ? Math.round((sent / total) * 100) : 0;
  const statusColor: Record<string, string> = {
    draft: 'secondary', scheduled: 'outline', running: 'default', paused: 'outline', done: 'secondary', failed: 'destructive',
  };
  return (
    <>
      <div className="border rounded-lg p-3 hover:bg-muted/30 cursor-pointer" onClick={() => setDetailsOpen(true)}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate">{c.name}</div>
            <div className="text-xs text-muted-foreground capitalize">{c.type} · {new Date(c.created_at).toLocaleString('fr-FR')}</div>
          </div>
          <Badge variant={(statusColor[c.status] ?? 'secondary') as any}>{c.status}</Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button size="icon" variant="ghost" className="h-7 w-7"><MoreVertical className="w-4 h-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={() => setDetailsOpen(true)}><Eye className="w-4 h-4 mr-2" />Voir détails</DropdownMenuItem>
              <DropdownMenuItem onClick={async () => {
                const newName = window.prompt('Renommer la campagne :', c.name);
                if (newName && newName !== c.name) await d.updateCampaign(c.id, { name: newName });
              }}><Settings className="w-4 h-4 mr-2" />Modifier le nom</DropdownMenuItem>
              {(c.status === 'failed' || c.status === 'done') && (
                <DropdownMenuItem onClick={async () => { await d.relaunchCampaign(c.id); }}>
                  <RefreshCw className="w-4 h-4 mr-2" />Relancer la campagne
                </DropdownMenuItem>
              )}
              {(c.status === 'running' || c.status === 'failed') && pending > 0 && (
                <DropdownMenuItem onClick={async () => { await d.runWorker(c.id); toast.success('Worker déclenché'); }}>
                  <Send className="w-4 h-4 mr-2" />Envoyer maintenant
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => d.duplicateCampaign(c)}><Copy className="w-4 h-4 mr-2" />Dupliquer</DropdownMenuItem>
              {c.status === 'running' && (
                <DropdownMenuItem onClick={() => d.pauseCampaign(c.id)}><Pause className="w-4 h-4 mr-2" />Mettre en pause</DropdownMenuItem>
              )}
              {c.status === 'paused' && (
                <DropdownMenuItem onClick={() => d.resumeCampaign(c.id)}><Play className="w-4 h-4 mr-2" />Reprendre</DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => { if (confirm(`Supprimer "${c.name}" ?`)) d.deleteCampaign(c.id); }}
              >
                <Trash2 className="w-4 h-4 mr-2" />Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {total > 0 && (
          <div className="mt-2 space-y-1">
            <Progress value={pct} />
            <div className="text-xs text-muted-foreground flex justify-between">
              <span>{sent}/{total} envoyés ({pct}%)</span>
              {failed > 0 && <span className="text-destructive">{failed} échec(s)</span>}
            </div>
          </div>
        )}
        {c.status === 'draft' && (
          <Button
            size="sm" className="mt-2 bg-green-600 hover:bg-green-700"
            onClick={(e) => { e.stopPropagation(); d.launchCampaign(c.id, { generateVariants: c.ai_variation, body: c.body }); }}
          >
            <Play className="w-3 h-3 mr-1" /> Lancer
          </Button>
        )}
        {c.status === 'running' && pending > 0 && (
          <Button
            size="sm" variant="outline" className="mt-2"
            onClick={(e) => { e.stopPropagation(); d.runWorker(c.id).then(() => toast.success('Worker déclenché')); }}
          >
            <Send className="w-3 h-3 mr-1" /> Envoyer maintenant ({pending})
          </Button>
        )}
      </div>
      <CampaignDetailsDialog open={detailsOpen} onClose={() => setDetailsOpen(false)} campaign={c} />
    </>
  );
};


const NewCampaignDialog: React.FC<{ open: boolean; onClose: () => void; d: any; s: ReturnType<typeof useDiffusionSessions>; onGotoSessions: () => void }> = ({ open, onClose, d, s, onGotoSessions }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState('text');
  const [body, setBody] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [aiVariation, setAiVariation] = useState(true);
  const [throttle, setThrottle] = useState(30);
  const [hStart, setHStart] = useState('08:00');
  const [hEnd, setHEnd] = useState('20:00');

  const reset = () => {
    setName(''); setType('text'); setBody(''); setSessionId(''); setMediaUrl(''); setSelectedContacts(new Set());
    setAiVariation(true); setThrottle(30); setHStart('08:00'); setHEnd('20:00');
  };

  const submit = async () => {
    if (!name || !body || !sessionId) { toast.error('Nom, message et session obligatoires'); return; }
    if (selectedContacts.size === 0) { toast.error('Sélectionnez au moins un contact'); return; }
    const row = await d.createCampaign({
      name, type, body, media_url: mediaUrl || null, session_id: sessionId,
      extra_contact_ids: [...selectedContacts],
      throttle_per_hour: throttle,
      active_hours_start: `${hStart}:00`, active_hours_end: `${hEnd}:00`,
      ai_variation: aiVariation,
    });
    if (row) { toast.success('Campagne créée (brouillon)'); reset(); onClose(); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90dvh] overflow-auto">
        <DialogHeader><DialogTitle>Nouvelle campagne WhatsApp</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nom de la campagne *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Promo Tabaski" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type *</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="text"><span className="flex items-center gap-2"><FileText className="w-4 h-4"/> Texte</span></SelectItem>
                  <SelectItem value="photo"><span className="flex items-center gap-2"><ImageIcon className="w-4 h-4"/> Photo + texte</span></SelectItem>
                  <SelectItem value="video"><span className="flex items-center gap-2"><Video className="w-4 h-4"/> Vidéo + texte</span></SelectItem>
                  <SelectItem value="audio"><span className="flex items-center gap-2"><Phone className="w-4 h-4"/> Audio</span></SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Session WAHA *</Label>
              {s.all.length === 0 ? (
                <div className="border border-dashed rounded p-2 text-xs text-center bg-amber-50">
                  Aucune session disponible.
                  <Button type="button" size="sm" variant="link" className="px-1 h-auto" onClick={onGotoSessions}>Créer une session</Button>
                </div>
              ) : (
                <Select value={sessionId} onValueChange={setSessionId}>
                  <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                  <SelectContent>
                    {s.mine.length > 0 && (
                      <SelectGroup>
                        <SelectLabel>Mes sessions</SelectLabel>
                        {s.mine.map(x => (
                          <SelectItem key={x.id} value={x.id}>
                            {x.session_name} {x.phone_number ?? ''} {(x.status === 'WORKING' || x.status === 'connected') && '✅'}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                    {s.shared.length > 0 && (
                      <SelectGroup>
                        <SelectLabel>Partagées (admin)</SelectLabel>
                        {s.shared.map(x => (
                          <SelectItem key={x.id} value={x.id}>
                            {x.session_name} {x.phone_number ?? ''} {(x.status === 'WORKING' || x.status === 'connected') && '✅'}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          {(type === 'photo' || type === 'video' || type === 'audio') && (
            <div>
              <Label>URL du média</Label>
              <Input value={mediaUrl} onChange={e => setMediaUrl(e.target.value)} placeholder="https://…" />
            </div>
          )}
          <div>
            <Label>Message * <span className="text-xs text-muted-foreground">(variables : {'{nom}'}, {'{prenom}'}, {'{tag}'})</span></Label>
            <Textarea rows={4} value={body} onChange={e => setBody(e.target.value.slice(0, 1024))} placeholder="Bonjour {prenom}, ..." />
            <div className="text-xs text-right text-muted-foreground">{body.length}/1024</div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={aiVariation} onCheckedChange={setAiVariation} id="ai" />
            <Label htmlFor="ai" className="text-sm flex items-center gap-1"><Sparkles className="w-4 h-4 text-amber-500" /> Variantes IA anti-spam</Label>
          </div>

          <div className="border rounded p-3 space-y-2 bg-muted/30">
            <div className="text-sm font-medium">⚙️ Anti-ban</div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label className="text-xs">Envois max/h</Label><Input type="number" value={throttle} onChange={e => setThrottle(Number(e.target.value))} /></div>
              <div><Label className="text-xs">Début actif</Label><Input type="time" value={hStart} onChange={e => setHStart(e.target.value)} /></div>
              <div><Label className="text-xs">Fin active</Label><Input type="time" value={hEnd} onChange={e => setHEnd(e.target.value)} /></div>
            </div>
          </div>

          <div>
            <Label>Audience ({selectedContacts.size} sélectionnés)</Label>
            <ScrollArea className="h-[180px] border rounded">
              <div className="divide-y">
                {d.contacts.filter((c: any) => !c.opt_out && !c.archived).map((c: any) => (
                  <label key={c.id} className="flex items-center gap-2 p-2 hover:bg-muted/40 cursor-pointer text-sm">
                    <input type="checkbox" checked={selectedContacts.has(c.id)} onChange={(e) => {
                      const s = new Set(selectedContacts);
                      if (e.target.checked) s.add(c.id); else s.delete(c.id);
                      setSelectedContacts(s);
                    }} />
                    <span className="flex-1">{c.display_name || '—'}</span>
                    <span className="text-xs font-mono text-muted-foreground">{c.phone_e164}</span>
                  </label>
                ))}
              </div>
            </ScrollArea>
            <div className="flex gap-2 mt-2">
              <Button size="sm" variant="outline" onClick={() => setSelectedContacts(new Set(d.contacts.filter((c: any) => !c.opt_out && !c.archived).map((c: any) => c.id)))}>Tout sélectionner</Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedContacts(new Set())}>Aucun</Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button className="bg-green-600 hover:bg-green-700" onClick={submit}>Créer la campagne</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ============ STATS ============
const StatsTab: React.FC<{ d: ReturnType<typeof useWaDiffusion> }> = ({ d }) => {
  const totals = d.campaigns.reduce((acc, c) => {
    acc.total += c.stats?.total ?? 0;
    acc.sent += c.stats?.sent ?? 0;
    return acc;
  }, { total: 0, sent: 0 });

  return (
    <Card className="border-green-200">
      <CardHeader><CardTitle className="text-green-700">Suivi global</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div className="border rounded p-3"><div className="text-xs text-muted-foreground">Contacts</div><div className="text-2xl font-bold">{d.contacts.length}</div></div>
          <div className="border rounded p-3"><div className="text-xs text-muted-foreground">Campagnes</div><div className="text-2xl font-bold">{d.campaigns.length}</div></div>
          <div className="border rounded p-3"><div className="text-xs text-muted-foreground">Messages envoyés</div><div className="text-2xl font-bold">{totals.sent}/{totals.total}</div></div>
        </div>
        <Button variant="outline" size="sm" onClick={() => d.refresh()}><RefreshCw className="w-4 h-4 mr-1" /> Actualiser</Button>
      </CardContent>
    </Card>
  );
};
