import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Send, Sparkles, KeyRound, ShieldCheck } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const CATEGORIES = [
  'Vie personnelle',
  'Travail et carrière',
  'Famille',
  'Santé',
  'Affaires et commerce',
  'Voyage',
  'Spiritualité',
];

const INTENTIONS = [
  'Comprendre ma situation',
  'Prendre une décision',
  'Anticiper un obstacle',
  'Clarifier une relation',
  'Préparer un projet',
];

const FOCUS = [
  { key: 'understand', label: 'Comprendre le signe', instruction: 'Explique le sens du signe dans la situation décrite.' },
  { key: 'decide', label: 'Aider à décider', instruction: 'Donne des repères concrets pour orienter la décision.' },
  { key: 'prepare', label: 'Préparer les prochains jours', instruction: 'Propose des points de vigilance et des appuis.' },
];

const DEVICE_KEY = 'waouh_fa_device_id';

function getDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_KEY);
    if (existing) return existing;
    const id = `web-${crypto.randomUUID()}`;
    localStorage.setItem(DEVICE_KEY, id);
    return id;
  } catch {
    return `web-${Math.random().toString(36).slice(2)}`;
  }
}

type Msg = { id: string; role: 'user' | 'assistant'; content: string };

/**
 * FA IA — consultation contextuelle, quota journalier et codes d'accès
 * (edge function `waouh-fa-chat`, tables `fa_settings` / `fa_access_codes`).
 */
export const FaIaScreen = () => {
  const deviceId = useMemo(getDeviceId, []);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [intention, setIntention] = useState(INTENTIONS[0]);
  const [focusKey, setFocusKey] = useState(FOCUS[0].key);
  const [signName, setSignName] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [sending, setSending] = useState(false);
  const [quota, setQuota] = useState<{ via?: string; remaining?: number | null; code_uses?: number | null; code_max?: number | null } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const send = async () => {
    const text = question.trim();
    if (!text || sending) return;
    setSending(true);
    setQuestion('');
    const userMsg: Msg = { id: crypto.randomUUID(), role: 'user', content: text };
    const history = messages.slice(-6).map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, userMsg]);

    try {
      const focus = FOCUS.find((item) => item.key === focusKey) ?? FOCUS[0];
      const { data, error } = await supabase.functions.invoke('waouh-fa-chat', {
        body: {
          user_message: text,
          device_id: deviceId,
          access_code: accessCode.replace(/\D/g, '') || undefined,
          history,
          sign: signName ? { canonical_name: signName, reference: signName } : undefined,
          context: { category, intention, locale: 'fr-BJ' },
          focus: { intent_key: focus.key, label: focus.label, instruction: focus.instruction },
        },
      });

      if (error) {
        const detail = (error as any)?.context?.body;
        let parsed: any = null;
        try { parsed = typeof detail === 'string' ? JSON.parse(detail) : detail; } catch { /* noop */ }
        const message = parsed?.message || parsed?.error || error.message || 'Consultation impossible.';
        toast.error(message);
        setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: message }]);
        return;
      }

      if ((data as any)?.error) {
        const message = (data as any).message || (data as any).error;
        toast.error(message);
        setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: message }]);
        return;
      }

      setQuota((data as any)?.quota ?? null);
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', content: String((data as any)?.answer || '') },
      ]);
    } catch (e: any) {
      toast.error(e?.message || 'Erreur réseau');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-4xl flex-col px-6 py-6">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
          <Sparkles size={20} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">FA IA</h2>
          <p className="text-sm text-muted-foreground">
            Consultation contextuelle en français clair. 1 consultation gratuite par jour, 3 avec un code d'accès.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Catégorie</label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Intention</label>
          <Select value={intention} onValueChange={setIntention}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {INTENTIONS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Angle d'analyse</label>
          <Select value={focusKey} onValueChange={setFocusKey}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {FOCUS.map((item) => <SelectItem key={item.key} value={item.key}>{item.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Signe (optionnel)</label>
          <Input value={signName} onChange={(e) => setSignName(e.target.value)} placeholder="Ex. Gbe-Medji" />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5">
          <KeyRound size={15} className="text-muted-foreground" />
          <input
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="Code à 6 chiffres"
            inputMode="numeric"
            className="w-36 bg-transparent text-sm outline-none"
          />
        </div>
        {quota && (
          <span className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
            <ShieldCheck size={13} />
            {quota.via === 'code'
              ? `Code : ${quota.code_uses ?? 0}/${quota.code_max ?? 3} utilisations`
              : 'Consultation gratuite du jour utilisée'}
          </span>
        )}
      </div>

      <div className="mt-5 flex-1 space-y-3 overflow-y-auto rounded-xl border border-border bg-card p-4">
        {messages.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Posez votre question pour lancer la consultation FA IA.
          </p>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={
              message.role === 'user'
                ? 'ml-auto max-w-[85%] rounded-xl bg-primary px-3 py-2 text-sm text-primary-foreground'
                : 'mr-auto max-w-[92%] rounded-xl bg-muted px-3 py-2 text-sm text-foreground'
            }
          >
            {message.role === 'assistant' ? (
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
            ) : (
              message.content
            )}
          </div>
        ))}
        {sending && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 size={15} className="animate-spin" /> FA IA analyse votre demande…
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="mt-3 flex items-end gap-2">
        <Textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          rows={2}
          placeholder="Votre question…"
          className="resize-none"
        />
        <Button type="button" onClick={() => void send()} disabled={sending || !question.trim()}>
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </Button>
      </div>
    </div>
  );
};

export default FaIaScreen;
