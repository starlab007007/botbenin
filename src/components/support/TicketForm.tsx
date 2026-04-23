import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Send } from 'lucide-react';
import { useSupportTickets } from '@/hooks/useSupportTickets';
import { SIGDSTS_MODULES, USER_PROFILES, SEVERITY_LABELS } from '@/types/support';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  prefilledDescription?: string;
  chatbotSessionId?: string;
}

export const TicketForm: React.FC<Props> = ({ open, onOpenChange, prefilledDescription, chatbotSessionId }) => {
  const navigate = useNavigate();
  const { createTicket } = useSupportTickets();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: prefilledDescription ?? '',
    category: 'incident',
    severity: 'mineure',
    module: '',
    site: '',
    profile: '',
    reproduction_steps: '',
  });

  React.useEffect(() => {
    if (prefilledDescription) setForm((f) => ({ ...f, description: prefilledDescription }));
  }, [prefilledDescription]);

  const submit = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      toast.error('Titre et description requis');
      return;
    }
    setSubmitting(true);
    try {
      const ticket = await createTicket({
        ...form,
        origin: chatbotSessionId ? 'chatbot_escalation' : 'manual',
        chatbot_session_id: chatbotSessionId,
      } as any);
      toast.success(`Ticket ${ticket?.ticket_number ?? ''} créé avec succès`);
      onOpenChange(false);
      if (ticket?.id) navigate(`/sigdsts/tickets/${ticket.id}`);
    } catch (e: any) {
      toast.error(e.message ?? 'Erreur lors de la création');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ouvrir un ticket — Support N2</DialogTitle>
          <DialogDescription>
            Décrivez votre problème ou demande. Un agent prendra en charge votre ticket selon le SLA défini par la sévérité.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="title">Titre *</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Résumé court du problème"
              maxLength={200}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Sévérité *</Label>
              <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SEVERITY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label} (SLA {v.sla})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Catégorie *</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="incident">Incident technique</SelectItem>
                  <SelectItem value="anomalie">Anomalie fonctionnelle</SelectItem>
                  <SelectItem value="evolution">Demande d'évolution</SelectItem>
                  <SelectItem value="question">Question / Information</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Module concerné</Label>
              <Select value={form.module} onValueChange={(v) => setForm({ ...form, module: v })}>
                <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                <SelectContent>
                  {SIGDSTS_MODULES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Profil utilisateur</Label>
              <Select value={form.profile} onValueChange={(v) => setForm({ ...form, profile: v })}>
                <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                <SelectContent>
                  {USER_PROFILES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="site">Site / Structure</Label>
            <Input
              id="site"
              value={form.site}
              onChange={(e) => setForm({ ...form, site: e.target.value })}
              placeholder="Ex : ANTS Atlantique-Littoral, BDS Cotonou…"
              maxLength={100}
            />
          </div>

          <div>
            <Label htmlFor="description">Description du problème *</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Décrivez ce qui s'est passé, le message d'erreur, les conséquences…"
              rows={4}
              maxLength={5000}
            />
          </div>

          <div>
            <Label htmlFor="repro">Étapes de reproduction (optionnel)</Label>
            <Textarea
              id="repro"
              value={form.reproduction_steps}
              onChange={(e) => setForm({ ...form, reproduction_steps: e.target.value })}
              placeholder="1. J'ai cliqué sur…&#10;2. J'ai sélectionné…&#10;3. L'erreur est apparue…"
              rows={3}
              maxLength={5000}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Annuler</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Envoyer le ticket
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
