import React, { useEffect, useState, useCallback } from 'react';
import { Helmet } from '@/components/SEO';
import { useParams, Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, ArrowLeft, MessageCircle, AlertTriangle, Mail, Clock, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SEVERITY_LABELS, STATUS_LABELS } from '@/types/support';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface GuestTicket {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  category: string;
  severity: keyof typeof SEVERITY_LABELS;
  status: keyof typeof STATUS_LABELS;
  module: string | null;
  site: string | null;
  profile: string | null;
  reproduction_steps: string | null;
  sla_due_at: string | null;
  sla_breached: boolean;
  resolved_at: string | null;
  closed_at: string | null;
  resolution_summary: string | null;
  created_at: string;
  updated_at: string;
  guest_email: string;
  guest_full_name: string;
  guest_token_expires: string | null;
}

interface GuestMessage {
  id: string;
  author_role: 'user' | 'support_agent' | 'admin' | 'system' | 'guest';
  message: string;
  created_at: string;
}

const SupportGuestTicketPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ticket, setTicket] = useState<GuestTicket | null>(null);
  const [messages, setMessages] = useState<GuestMessage[]>([]);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke('support-guest-ticket-get', {
        body: { token },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setTicket((data as any).ticket);
      setMessages((data as any).messages ?? []);
    } catch (e: any) {
      setError(e?.message ?? 'Impossible de charger le ticket');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  // Polling toutes les 20s pour voir les nouvelles réponses
  useEffect(() => {
    const i = setInterval(load, 20000);
    return () => clearInterval(i);
  }, [load]);

  const sendReply = async () => {
    if (!reply.trim() || !token) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('support-guest-ticket-message', {
        body: { token, message: reply.trim() },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setReply('');
      toast.success('Message envoyé');
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? 'Erreur lors de l\'envoi');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>{ticket ? `Ticket ${ticket.ticket_number} | SIGDSTS` : 'Suivi de ticket | SIGDSTS'}</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950/20 dark:to-blue-950/20">
        <div className="container mx-auto px-4 py-6 lg:py-10 max-w-3xl">
          <Link to="/sigdsts" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4">
            <ArrowLeft className="w-4 h-4" /> Retour au support
          </Link>

          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          )}

          {error && !loading && (
            <Card className="p-8 text-center border-destructive/30">
              <AlertTriangle className="w-12 h-12 mx-auto text-destructive mb-3" />
              <h1 className="text-xl font-bold mb-2">Lien invalide ou expiré</h1>
              <p className="text-muted-foreground mb-5">{error}</p>
              <Button asChild>
                <Link to="/sigdsts/ticket-express">Créer un nouveau ticket</Link>
              </Button>
            </Card>
          )}

          {ticket && !loading && (
            <>
              <Card className="p-5 lg:p-6 mb-4">
                <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                  <div>
                    <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-300 mb-2">
                      <Sparkles className="w-3 h-3 mr-1" /> Ticket Invité
                    </Badge>
                    <h1 className="text-xl lg:text-2xl font-bold">{ticket.title}</h1>
                    <p className="text-sm text-muted-foreground font-mono mt-1">{ticket.ticket_number}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge className={SEVERITY_LABELS[ticket.severity].color}>
                      {SEVERITY_LABELS[ticket.severity].label}
                    </Badge>
                    <Badge variant="outline" className={STATUS_LABELS[ticket.status].color}>
                      {STATUS_LABELS[ticket.status].label}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mt-4">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{ticket.guest_email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span>Créé {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true, locale: fr })}</span>
                  </div>
                  {ticket.module && <div><strong>Module :</strong> {ticket.module}</div>}
                  {ticket.site && <div><strong>Site :</strong> {ticket.site}</div>}
                </div>

                {ticket.sla_due_at && ticket.status !== 'resolu' && ticket.status !== 'clos' && (
                  <div className={`mt-4 p-3 rounded-md text-sm ${ticket.sla_breached ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-amber-50 text-amber-800 border border-amber-200'}`}>
                    <strong>SLA :</strong> {ticket.sla_breached ? 'Dépassé — ' : 'Échéance '}
                    {formatDistanceToNow(new Date(ticket.sla_due_at), { addSuffix: true, locale: fr })}
                  </div>
                )}
              </Card>

              <Card className="p-5 lg:p-6 mb-4">
                <h2 className="font-semibold mb-4 flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" /> Conversation ({messages.length})
                </h2>
                <div className="space-y-3 mb-5">
                  {messages.map((m) => {
                    const isGuest = m.author_role === 'guest' || m.author_role === 'user';
                    return (
                      <div key={m.id} className={`flex ${isGuest ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                          isGuest
                            ? 'bg-primary text-primary-foreground rounded-tr-sm'
                            : 'bg-muted rounded-tl-sm'
                        }`}>
                          <div className="text-xs opacity-75 mb-1">
                            {isGuest ? ticket.guest_full_name : m.author_role === 'support_agent' || m.author_role === 'admin' ? 'Support N2' : 'Système'}
                            {' · '}
                            {formatDistanceToNow(new Date(m.created_at), { addSuffix: true, locale: fr })}
                          </div>
                          <div className="whitespace-pre-wrap break-words">{m.message}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {ticket.status !== 'clos' ? (
                  <div className="border-t pt-4">
                    <Textarea
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder="Ajouter une information, répondre à un agent…"
                      rows={3}
                      maxLength={5000}
                      disabled={sending}
                    />
                    <div className="flex justify-end mt-2">
                      <Button onClick={sendReply} disabled={sending || !reply.trim()}>
                        {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                        Envoyer
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="border-t pt-4 text-sm text-muted-foreground text-center">
                    Ce ticket est clos. <Link to="/sigdsts/ticket-express" className="text-primary hover:underline">Créer un nouveau ticket</Link>
                  </div>
                )}
              </Card>

              <Card className="p-4 bg-muted/40 text-xs text-muted-foreground">
                💡 <strong>Astuce :</strong> Créez un compte avec l'email <strong>{ticket.guest_email}</strong> pour récupérer ce ticket dans votre tableau de bord et accéder à l'historique complet.{' '}
                <Link to="/auth" className="text-primary hover:underline">S'inscrire</Link>
              </Card>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default SupportGuestTicketPage;
