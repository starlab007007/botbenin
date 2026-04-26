import React, { useState } from 'react';
import { Helmet } from '@/components/SEO';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, CheckCircle2, Loader2, Send, Shield, Sparkles, Copy, ExternalLink, Mail } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { SIGDSTS_MODULES, USER_PROFILES, SEVERITY_LABELS } from '@/types/support';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SuccessState {
  ticket_number: string;
  tracking_url: string;
  email_sent: boolean;
  token: string;
}

const SupportTicketExpressPage: React.FC = () => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<SuccessState | null>(null);
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    site: '',
    profile: '',
    module: '',
    title: '',
    description: '',
    reproduction_steps: '',
    category: 'incident',
    severity: 'mineure',
    website: '', // honeypot — doit rester vide
  });

  const update = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim() || !form.email.trim() || !form.title.trim() || !form.description.trim()) {
      toast.error('Nom, email, titre et description sont obligatoires.');
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('support-create-ticket-public', {
        body: form,
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      setSuccess({
        ticket_number: (data as any).ticket_number,
        tracking_url: (data as any).tracking_url,
        email_sent: !!(data as any).email_sent,
        token: (data as any).token,
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      toast.error(err?.message ?? 'Erreur lors de la création du ticket');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <>
        <Helmet>
          <title>Ticket SIGDSTS {success.ticket_number} créé | Bot.bj</title>
          <meta name="description" content="Votre ticket de support SIGDSTS a été créé avec succès." />
        </Helmet>
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-emerald-950/20 dark:via-background dark:to-blue-950/20">
          <div className="container mx-auto px-4 py-8 lg:py-16 max-w-2xl">
            <Card className="p-6 lg:p-10 shadow-xl border-emerald-200">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mx-auto mb-5">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold text-center mb-2">Ticket créé avec succès</h1>
              <p className="text-center text-muted-foreground mb-6">
                Numéro&nbsp;: <span className="font-mono font-semibold text-foreground">{success.ticket_number}</span>
              </p>

              <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 p-4 mb-5 flex gap-3">
                <Mail className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-sm">
                  {success.email_sent ? (
                    <p>
                      Un email de confirmation contenant votre <strong>lien de suivi personnel</strong> vient d'être envoyé à <strong>{form.email}</strong>. Vérifiez votre boîte (et les spams).
                    </p>
                  ) : (
                    <p className="text-amber-800">
                      L'envoi d'email a échoué. <strong>Conservez impérativement le lien ci-dessous</strong> pour suivre votre ticket — c'est votre seul moyen d'y accéder sans compte.
                    </p>
                  )}
                </div>
              </div>

              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Lien de suivi (à conserver)</Label>
              <div className="flex gap-2 mt-1 mb-6">
                <Input value={success.tracking_url} readOnly className="font-mono text-xs" />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(success.tracking_url);
                    toast.success('Lien copié');
                  }}
                  aria-label="Copier le lien"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button asChild className="flex-1">
                  <Link to={`/sigdsts/t/${success.token}`}>
                    Suivre mon ticket maintenant <ExternalLink className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
                <Button variant="outline" onClick={() => navigate('/sigdsts')} className="flex-1">
                  Retour au support
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center mt-6">
                Vous pouvez aussi <Link to="/auth" className="text-primary hover:underline">créer un compte</Link> avec cet email pour récupérer ce ticket dans votre tableau de bord.
              </p>
            </Card>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Ticket Express SIGDSTS — sans inscription | Bot.bj</title>
        <meta name="description" content="Ouvrez un ticket de support SIGDSTS sans créer de compte. Suivi par email avec lien personnel sécurisé. SLA garanti." />
        <link rel="canonical" href="https://bot.bj/sigdsts/ticket-express" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-emerald-950/10 dark:via-background dark:to-blue-950/10">
        <div className="container mx-auto px-4 py-6 lg:py-10 max-w-3xl">
          <Link to="/sigdsts" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4">
            <ArrowLeft className="w-4 h-4" /> Retour au support
          </Link>

          <div className="mb-6">
            <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 mb-3">
              <Sparkles className="w-3 h-3 mr-1" /> Aucun compte requis
            </Badge>
            <h1 className="text-2xl lg:text-4xl font-bold tracking-tight mb-2">Ticket Express SIGDSTS</h1>
            <p className="text-muted-foreground">
              Signalez un incident en 30 secondes, sans inscription. Vous recevrez par email un lien personnel pour suivre votre ticket.
            </p>
          </div>

          <form onSubmit={submit}>
            <Card className="p-5 lg:p-6 mb-4">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-600" /> Vos coordonnées
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="full_name">Nom complet *</Label>
                  <Input id="full_name" value={form.full_name} onChange={(e) => update('full_name')(e.target.value)} maxLength={100} required />
                </div>
                <div>
                  <Label htmlFor="email">Email professionnel *</Label>
                  <Input id="email" type="email" value={form.email} onChange={(e) => update('email')(e.target.value)} maxLength={254} required />
                </div>
                <div>
                  <Label htmlFor="phone">Téléphone (optionnel)</Label>
                  <Input id="phone" type="tel" value={form.phone} onChange={(e) => update('phone')(e.target.value)} maxLength={30} placeholder="Ex : +229 01 90 00 00 00" />
                </div>
                <div>
                  <Label htmlFor="site">Site / Structure</Label>
                  <Input id="site" value={form.site} onChange={(e) => update('site')(e.target.value)} maxLength={100} placeholder="ANTS Atlantique-Littoral, BDS Cotonou…" />
                </div>
                <div>
                  <Label>Profil utilisateur</Label>
                  <Select value={form.profile} onValueChange={update('profile')}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                    <SelectContent>
                      {USER_PROFILES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Module concerné</Label>
                  <Select value={form.module} onValueChange={update('module')}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                    <SelectContent>
                      {SIGDSTS_MODULES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Honeypot anti-bot — caché */}
              <div aria-hidden="true" className="absolute -left-[9999px] -top-[9999px] opacity-0 pointer-events-none">
                <Label htmlFor="website">Website</Label>
                <Input id="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => update('website')(e.target.value)} />
              </div>
            </Card>

            <Card className="p-5 lg:p-6 mb-4">
              <h2 className="font-semibold mb-4">Décrivez le problème</h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Titre court *</Label>
                  <Input id="title" value={form.title} onChange={(e) => update('title')(e.target.value)} maxLength={200} placeholder="Ex : Impossible d'enregistrer un don" required />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Sévérité *</Label>
                    <Select value={form.severity} onValueChange={update('severity')}>
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
                    <Select value={form.category} onValueChange={update('category')}>
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

                <div>
                  <Label htmlFor="description">Description détaillée *</Label>
                  <Textarea id="description" value={form.description} onChange={(e) => update('description')(e.target.value)} maxLength={5000} rows={5} placeholder="Décrivez ce qui s'est passé, le message d'erreur, les conséquences sur votre travail…" required />
                </div>

                <div>
                  <Label htmlFor="repro">Étapes de reproduction (optionnel)</Label>
                  <Textarea id="repro" value={form.reproduction_steps} onChange={(e) => update('reproduction_steps')(e.target.value)} maxLength={5000} rows={3} placeholder="1. J'ai cliqué sur…&#10;2. J'ai sélectionné…&#10;3. L'erreur est apparue…" />
                </div>
              </div>
            </Card>

            <Card className="p-4 mb-4 bg-muted/40">
              <p className="text-xs text-muted-foreground">
                🔒 Vos données sont transmises via une connexion chiffrée. Un lien de suivi unique vous sera envoyé par email — il est strictement personnel et valable 90 jours. Aucun mot de passe n'est requis.
              </p>
            </Card>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button type="submit" disabled={submitting} size="lg" className="flex-1">
                {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Envoyer le ticket
              </Button>
              <Button type="button" variant="outline" size="lg" onClick={() => navigate('/sigdsts')}>
                Annuler
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground mt-4">
              Vous avez déjà un compte ? <Link to="/sigdsts/tickets" className="text-primary hover:underline">Ouvrez un ticket depuis votre tableau de bord</Link>.
            </p>
          </form>
        </div>
      </div>
    </>
  );
};

export default SupportTicketExpressPage;
