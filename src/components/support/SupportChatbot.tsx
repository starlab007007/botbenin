import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Bot, Send, AlertTriangle, Loader2, ArrowUpRight, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ChatMsg { role: 'user' | 'assistant'; content: string }

interface Props {
  onEscalate?: (conversation: ChatMsg[]) => void;
  className?: string;
}

const QUICK_PROMPTS = [
  'Connexion impossible à SIGDSTS',
  'Comment créer un nouveau donneur ?',
  'Erreur lors d’un prélèvement',
  'Problème de qualification biologique',
  'Comment distribuer un PSL ?',
  'Que faire en cas de bug bloquant ?',
];

export const SupportChatbot: React.FC<Props> = ({ onEscalate, className }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [needsEscalation, setNeedsEscalation] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, streaming]);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;

    const userMsg: ChatMsg = { role: 'user', content: trimmed };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setStreaming(true);
    setNeedsEscalation(false);

    let assistantSoFar = '';
    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: 'assistant', content: assistantSoFar }];
      });
    };

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/support-chatbot-n1`;
      const { data: sess } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (sess?.session?.access_token) headers.Authorization = `Bearer ${sess.session.access_token}`;
      else headers.Authorization = `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`;

      const resp = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ messages: newMessages, userId: user?.id ?? null }),
      });

      if (!resp.ok || !resp.body) {
        if (resp.status === 429) toast.error('Trop de requêtes — réessayez dans 1 minute');
        else if (resp.status === 402) toast.error('Crédits IA épuisés');
        else toast.error('Erreur du chatbot — un agent humain peut vous aider');
        setNeedsEscalation(true);
        setStreaming(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let done = false;

      while (!done) {
        const r = await reader.read();
        if (r.done) break;
        buffer += decoder.decode(r.value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const json = line.slice(6).trim();
          if (json === '[DONE]') { done = true; break; }
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) upsertAssistant(content);
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }

      // Detect escalation marker
      if (assistantSoFar.includes('[ESCALATE_N2]')) {
        setNeedsEscalation(true);
        setMessages((prev) => prev.map((m, i) =>
          i === prev.length - 1 ? { ...m, content: m.content.replace('[ESCALATE_N2]', '').trim() } : m
        ));
      }
    } catch (e: any) {
      console.error(e);
      toast.error('Connexion au chatbot impossible');
      setNeedsEscalation(true);
    } finally {
      setStreaming(false);
    }
  }, [messages, streaming, user]);

  return (
    <Card className={`flex flex-col h-[600px] max-h-[80vh] overflow-hidden ${className ?? ''}`}>
      <div className="flex items-center gap-3 p-4 border-b bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-950/30 dark:to-blue-950/30">
        <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center shadow-md">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold flex items-center gap-2">
            Assistant Support N1
            <Sparkles className="w-4 h-4 text-amber-500" />
          </h3>
          <p className="text-xs text-muted-foreground">Basé sur le Guide SIGDSTS — Réponse immédiate 24/7</p>
        </div>
        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 hidden sm:inline-flex">
          ● En ligne
        </Badge>
      </div>

      <ScrollArea className="flex-1 px-4 py-3" ref={scrollRef as any}>
        {messages.length === 0 && (
          <div className="space-y-4">
            <div className="text-center py-6">
              <Bot className="w-12 h-12 text-emerald-600 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Bonjour 👋 Je suis l'assistant SIGDSTS. Je peux vous aider sur l'utilisation de la plateforme.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  className="text-left text-sm p-3 rounded-lg border bg-card hover:bg-accent transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                m.role === 'user'
                  ? 'bg-emerald-600 text-white rounded-br-sm'
                  : 'bg-muted text-foreground rounded-bl-sm'
              }`}>
                {m.role === 'assistant' ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1">
                    <ReactMarkdown>{m.content || '...'}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{m.content}</p>
                )}
              </div>
            </div>
          ))}
          {streaming && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl px-4 py-2.5 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Recherche dans le Guide SIGDSTS…
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {needsEscalation && (
        <div className="border-t bg-amber-50 dark:bg-amber-950/30 px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="flex-1 text-sm">
            <p className="font-medium">Besoin d'un agent humain ?</p>
            <p className="text-xs text-muted-foreground">Créons un ticket pour le support N2 (SLA garanti)</p>
          </div>
          <Button size="sm" onClick={() => onEscalate?.(messages)} className="shrink-0">
            <ArrowUpRight className="w-4 h-4 mr-1" /> Ouvrir un ticket
          </Button>
        </div>
      )}

      <div className="border-t p-3 flex gap-2 bg-card">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
          placeholder="Posez votre question…"
          disabled={streaming}
          className="flex-1"
          maxLength={500}
        />
        <Button onClick={() => send(input)} disabled={streaming || !input.trim()} size="icon">
          {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </Card>
  );
};
