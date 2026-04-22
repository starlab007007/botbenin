import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from '@/components/SEO';
import { useSupportTicket, useSupportTickets } from '@/hooks/useSupportTickets';
import { useAdminRole } from '@/hooks/useAdminRole';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowLeft, Send, Hash, Calendar, User as UserIcon, Building2, Layers } from 'lucide-react';
import { SEVERITY_LABELS, STATUS_LABELS } from '@/types/support';
import { SLABadge } from '@/components/support/SLABadge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const SupportTicketDetailPage: React.FC = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { isAdmin } = useAdminRole();
  const { ticket, messages, loading, addMessage } = useSupportTicket(id);
  const { updateTicketStatus } = useSupportTickets({ adminMode: true });
  const [reply, setReply] = useState('');
  const [internal, setInternal] = useState(false);
  const [sending, setSending] = useState(false);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }
  if (!ticket) {
    return (
      <div className="container mx-auto py-10 max-w-2xl">
        <Card className="p-8 text-center">
          <p className="mb-4">Ticket introuvable.</p>
          <Button asChild variant="outline"><Link to="/support/tickets"><ArrowLeft className="w-4 h-4 mr-2" /> Retour</Link></Button>
        </Card>
      </div>
    );
  }

  const sev = SEVERITY_LABELS[ticket.severity];
  const stat = STATUS_LABELS[ticket.status];
  const resolved = ticket.status === 'resolu' || ticket.status === 'clos';

  const send = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      await addMessage(reply, internal && isAdmin);
      setReply('');
      setInternal(false);
    } catch (e: any) {
      toast.error(e.message ?? 'Erreur d\'envoi');
    } finally {
      setSending(false);
    }
  };

  const changeStatus = async (s: string) => {
    try {
      await updateTicketStatus(ticket.id, s as any);
      toast.success('Statut mis à jour');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <>
      <Helmet><title>{ticket.ticket_number} — {ticket.title} | Support SIGDSTS</title></Helmet>

      <div className="container mx-auto px-4 py-6 max-w-5xl">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to={isAdmin ? '/support/admin/tickets' : '/support/tickets'}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Retour
          </Link>
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <Card className="p-5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono mb-2">
                <Hash className="w-3 h-3" /> {ticket.ticket_number}
              </div>
              <h1 className="text-xl lg:text-2xl font-bold mb-3">{ticket.title}</h1>
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge className={sev.color}>{sev.label}</Badge>
                <Badge variant="outline" className={stat.color}>{stat.label}</Badge>
                <SLABadge dueAt={ticket.sla_due_at} breached={ticket.sla_breached} resolved={resolved} />
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                {ticket.description}
              </div>
              {ticket.reproduction_steps && (
                <div className="mt-4 p-3 bg-muted rounded-md">
                  <p className="text-xs font-semibold mb-1">Étapes de reproduction</p>
                  <p className="text-sm whitespace-pre-wrap">{ticket.reproduction_steps}</p>
                </div>
              )}
            </Card>

            <Card className="p-5">
              <h2 className="font-semibold mb-3">Conversation</h2>
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {messages.map((m) => (
                  <div key={m.id} className={`p-3 rounded-lg ${
                    m.is_internal_note ? 'bg-amber-50 border border-amber-200' :
                    m.author_id === user?.id ? 'bg-primary/5 border border-primary/20' : 'bg-muted'
                  }`}>
                    <div className="flex items-center justify-between mb-1 text-xs text-muted-foreground">
                      <span className="font-medium">
                        {m.author_role === 'support_agent' || m.author_role === 'admin' ? '🛠 Support' : '👤 Utilisateur'}
                        {m.is_internal_note && <Badge variant="outline" className="ml-2 text-[10px]">Note interne</Badge>}
                      </span>
                      <span>{format(new Date(m.created_at), 'dd MMM HH:mm', { locale: fr })}</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{m.message}</p>
                  </div>
                ))}
                {messages.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Aucun message</p>}
              </div>

              {!resolved && (
                <div className="mt-4 space-y-2">
                  <Textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Votre réponse…"
                    rows={3}
                    maxLength={5000}
                  />
                  <div className="flex items-center justify-between gap-2">
                    {isAdmin && (
                      <label className="flex items-center gap-2 text-xs">
                        <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} />
                        Note interne (invisible pour l'utilisateur)
                      </label>
                    )}
                    <Button onClick={send} disabled={sending || !reply.trim()} size="sm" className="ml-auto">
                      {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />} Envoyer
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-3 text-sm">Détails</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2"><Calendar className="w-4 h-4 text-muted-foreground" /> Créé le {format(new Date(ticket.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}</li>
                {ticket.module && <li className="flex items-center gap-2"><Layers className="w-4 h-4 text-muted-foreground" /> {ticket.module}</li>}
                {ticket.site && <li className="flex items-center gap-2"><Building2 className="w-4 h-4 text-muted-foreground" /> {ticket.site}</li>}
                {ticket.profile && <li className="flex items-center gap-2"><UserIcon className="w-4 h-4 text-muted-foreground" /> {ticket.profile}</li>}
              </ul>
            </Card>

            {isAdmin && (
              <Card className="p-4">
                <h3 className="font-semibold mb-3 text-sm">Actions admin</h3>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Statut</label>
                    <Select value={ticket.status} onValueChange={changeStatus}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ouvert">Ouvert</SelectItem>
                        <SelectItem value="en_cours">En cours</SelectItem>
                        <SelectItem value="resolu">Résolu</SelectItem>
                        <SelectItem value="clos">Clos</SelectItem>
                        <SelectItem value="escalade_n3">Escalader N3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default SupportTicketDetailPage;
