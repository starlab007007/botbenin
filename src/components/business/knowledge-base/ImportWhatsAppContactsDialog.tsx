import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Upload, FileText, Users, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { normalizeBeninWhatsApp } from '@/lib/phone';

interface ParsedContact {
  nom_contact: string;
  contact_whatsapp: string; // canonique +22901XXXXXXXX
  display: string;
  raw: string;
  status: 'valid' | 'invalid' | 'duplicate';
  reason?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingPhones: string[]; // numéros déjà présents (canonique +22901... ou +229...)
  defaultCampaign: { id: string; name: string };
  onImport: (rows: { nom_contact: string; contact_whatsapp: string; id_campagne: string; nom_campagne: string; statut: string }[]) => Promise<number>;
  isWriting: boolean;
}

const NAME_KEYS = ['nom', 'name', 'nom_contact', 'contact', 'prenom', 'fullname'];
const PHONE_KEYS = ['whatsapp', 'phone', 'tel', 'telephone', 'numero', 'contact_whatsapp', 'mobile'];

const normalizeKey = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

/** Existing phones set, indexed on both 8- and 10-digit canonical for dedup. */
const buildExistingSet = (existing: string[]): Set<string> => {
  const s = new Set<string>();
  existing.forEach((p) => {
    const n = normalizeBeninWhatsApp(p);
    if (n.valid) {
      s.add(n.e164_10);
      if (n.e164_8) s.add(n.e164_8);
    }
  });
  return s;
};

const parseText = (text: string): { name: string; phone: string; raw: string }[] => {
  const lines = text.split(/[\n,;]+/).map(l => l.trim()).filter(Boolean);
  return lines.map(line => {
    // formats acceptés: "Nom +22901XX...", "Nom; +22901...", "Nom, +22901...", "+22901..."
    const m = line.match(/^(.+?)[\s:;|\-—–]+(\+?\d[\d\s\-.]{5,})$/);
    if (m) return { name: m[1].trim(), phone: m[2].trim(), raw: line };
    // tente numéro seul
    if (/^\+?\d[\d\s\-.]+$/.test(line)) return { name: '', phone: line, raw: line };
    return { name: '', phone: line, raw: line };
  });
};

const parseCSV = (text: string): { name: string; phone: string; raw: string }[] => {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  const splitLine = (l: string) => l.split(/[,;\t]/).map(s => s.replace(/^"|"$/g, '').trim());
  const header = splitLine(lines[0]).map(normalizeKey);
  const nameIdx = header.findIndex(h => NAME_KEYS.includes(h));
  const phoneIdx = header.findIndex(h => PHONE_KEYS.includes(h));
  if (phoneIdx === -1) {
    // pas d'en-tête → fallback texte
    return parseText(text);
  }
  return lines.slice(1).map(line => {
    const cells = splitLine(line);
    return {
      name: nameIdx >= 0 ? (cells[nameIdx] || '') : '',
      phone: cells[phoneIdx] || '',
      raw: line,
    };
  });
};

const parseVCard = (text: string): { name: string; phone: string; raw: string }[] => {
  const cards = text.split(/BEGIN:VCARD/i).slice(1);
  return cards.flatMap(card => {
    const nameMatch = card.match(/FN[^:]*:(.+)/i);
    const name = nameMatch ? nameMatch[1].trim() : '';
    const phones = [...card.matchAll(/TEL[^:]*:([+\d\s\-.()]+)/gi)].map(m => m[1].trim());
    return phones.map(p => ({ name, phone: p, raw: `${name} ${p}` }));
  });
};

export const ImportWhatsAppContactsDialog: React.FC<Props> = ({
  open, onOpenChange, existingPhones, defaultCampaign, onImport, isWriting,
}) => {
  const [mode, setMode] = useState<'text' | 'csv' | 'vcard'>('text');
  const [text, setText] = useState('');

  const existingSet = useMemo(() => buildExistingSet(existingPhones), [existingPhones]);

  const parsed: ParsedContact[] = useMemo(() => {
    if (!text.trim()) return [];
    const raw = mode === 'csv' ? parseCSV(text) : mode === 'vcard' ? parseVCard(text) : parseText(text);
    const seen = new Set<string>();
    return raw.map(({ name, phone, raw: rawLine }) => {
      const n = normalizeBeninWhatsApp(phone);
      if (!n.valid) {
        return { nom_contact: name, contact_whatsapp: '', display: phone, raw: rawLine, status: 'invalid', reason: n.reason };
      }
      const key = n.e164_10;
      if (existingSet.has(key) || existingSet.has(n.e164_8)) {
        return { nom_contact: name, contact_whatsapp: key, display: n.display, raw: rawLine, status: 'duplicate', reason: 'Déjà dans votre base' };
      }
      if (seen.has(key)) {
        return { nom_contact: name, contact_whatsapp: key, display: n.display, raw: rawLine, status: 'duplicate', reason: 'Doublon dans cet import' };
      }
      seen.add(key);
      return { nom_contact: name || 'Contact', contact_whatsapp: key, display: n.display, raw: rawLine, status: 'valid' };
    });
  }, [text, mode, existingSet]);

  const stats = useMemo(() => ({
    valid: parsed.filter(p => p.status === 'valid').length,
    invalid: parsed.filter(p => p.status === 'invalid').length,
    duplicate: parsed.filter(p => p.status === 'duplicate').length,
  }), [parsed]);

  const handleFile = async (file: File) => {
    const txt = await file.text();
    setText(txt);
    if (file.name.toLowerCase().endsWith('.vcf')) setMode('vcard');
    else if (file.name.toLowerCase().match(/\.(csv|tsv|txt)$/)) setMode('csv');
  };

  const handleImport = async () => {
    const valid = parsed.filter(p => p.status === 'valid');
    if (valid.length === 0) return;
    const rows = valid.map(p => ({
      nom_contact: p.nom_contact,
      contact_whatsapp: p.contact_whatsapp,
      id_campagne: defaultCampaign.id,
      nom_campagne: defaultCampaign.name,
      statut: 'Actif',
    }));
    const added = await onImport(rows);
    if (added > 0) {
      setText('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col w-[95vw] max-w-2xl h-[90dvh] sm:h-auto max-h-[90dvh] overflow-hidden p-0">
        <div className="shrink-0 p-4 sm:p-6 pb-3 border-b">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-green-600" />
              Importer des contacts WhatsApp
            </DialogTitle>
            <DialogDescription className="text-xs">
              Bénin · normalisation auto +229 / +22901 · déduplication intelligente
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 px-4 sm:px-6 py-4 space-y-4">
          <Tabs value={mode} onValueChange={(v: any) => setMode(v)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="text"><FileText className="w-3.5 h-3.5 mr-1" />Texte</TabsTrigger>
              <TabsTrigger value="csv"><Users className="w-3.5 h-3.5 mr-1" />CSV</TabsTrigger>
              <TabsTrigger value="vcard">vCard</TabsTrigger>
            </TabsList>

            <TabsContent value="text" className="space-y-2 mt-3">
              <Label className="text-xs">Collez vos contacts (un par ligne, ou séparés par virgule/point-virgule)</Label>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={`Adjoua Koffi; +22901971234567\nKofi Mensah, 0197654321\n+22995123456`}
                className="min-h-[140px] font-mono text-xs"
              />
            </TabsContent>

            <TabsContent value="csv" className="space-y-2 mt-3">
              <Label className="text-xs">Fichier CSV (colonnes <code>nom,whatsapp</code>)</Label>
              <Input type="file" accept=".csv,.tsv,.txt" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              {text && (
                <Textarea value={text} onChange={(e) => setText(e.target.value)} className="min-h-[100px] font-mono text-xs" />
              )}
            </TabsContent>

            <TabsContent value="vcard" className="space-y-2 mt-3">
              <Label className="text-xs">Fichier vCard (.vcf, export contacts téléphone)</Label>
              <Input type="file" accept=".vcf" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </TabsContent>
          </Tabs>

          {parsed.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="default" className="bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" />{stats.valid} valides</Badge>
                {stats.duplicate > 0 && <Badge variant="secondary"><Users className="w-3 h-3 mr-1" />{stats.duplicate} doublons</Badge>}
                {stats.invalid > 0 && <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />{stats.invalid} invalides</Badge>}
              </div>

              <div className="border rounded-lg max-h-[200px] overflow-y-auto divide-y">
                {parsed.slice(0, 100).map((p, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{p.nom_contact || '—'}</div>
                      <div className="truncate text-muted-foreground font-mono">{p.display || p.raw}</div>
                    </div>
                    {p.status === 'valid' && <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />}
                    {p.status === 'duplicate' && <Badge variant="secondary" className="text-[10px] shrink-0">{p.reason}</Badge>}
                    {p.status === 'invalid' && <Badge variant="destructive" className="text-[10px] shrink-0"><X className="w-3 h-3 mr-0.5" />{p.reason}</Badge>}
                  </div>
                ))}
                {parsed.length > 100 && <div className="px-3 py-1.5 text-[10px] text-muted-foreground">… +{parsed.length - 100} de plus</div>}
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 flex flex-col-reverse sm:flex-row justify-end gap-2 p-4 sm:px-6 border-t bg-background">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleImport} disabled={isWriting || stats.valid === 0}>
            {isWriting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            Importer {stats.valid} contact{stats.valid > 1 ? 's' : ''}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
