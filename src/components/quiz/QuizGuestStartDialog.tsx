import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Mail, Sparkles, CheckCircle2, Copy } from 'lucide-react';
import { startGuestSession } from '@/lib/quizGuestSync';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess?: () => void;
}

export const QuizGuestStartDialog: React.FC<Props> = ({ open, onOpenChange, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [organization, setOrganization] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ tracking_url: string; email_sent: boolean } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (website) return; // honeypot
    if (!email.trim() || !fullName.trim()) {
      toast.error('Email et nom complet requis');
      return;
    }
    setLoading(true);
    try {
      const r = await startGuestSession({
        email: email.trim(),
        full_name: fullName.trim(),
        organization: organization.trim() || undefined,
      });
      setResult({ tracking_url: r.tracking_url, email_sent: r.email_sent });
      toast.success('Espace créé', {
        description: r.email_sent ? 'Lien envoyé par email' : 'Conservez le lien ci-dessous',
      });
      onSuccess?.();
    } catch (err: any) {
      toast.error(err?.message ?? 'Échec de la création');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.tracking_url);
    toast.success('Lien copié');
  };

  const close = () => {
    onOpenChange(false);
    setTimeout(() => {
      setResult(null); setEmail(''); setFullName(''); setOrganization('');
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(v) : close())}>
      <DialogContent className="max-w-[90vw] sm:max-w-md max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {result ? 'Votre espace est prêt 🎓' : 'Créer mon espace de formation'}
          </DialogTitle>
          <DialogDescription>
            {result
              ? 'Conservez précieusement votre lien personnel — il vous donne accès à tous vos résultats sans mot de passe.'
              : 'Renseignez votre email pour suivre vos évaluations sur tous vos appareils. Aucun mot de passe requis.'}
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="text" name="website" tabIndex={-1} autoComplete="off"
              value={website} onChange={(e) => setWebsite(e.target.value)}
              className="hidden" aria-hidden="true" />

            <div className="space-y-1.5">
              <Label htmlFor="quiz-email">Email *</Label>
              <Input id="quiz-email" type="email" required maxLength={254}
                value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.bj" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quiz-name">Nom complet *</Label>
              <Input id="quiz-name" required maxLength={100}
                value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="KOUASSI Marie" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quiz-org">Organisation / BDS (facultatif)</Label>
              <Input id="quiz-org" maxLength={150}
                value={organization} onChange={(e) => setOrganization(e.target.value)} placeholder="BDS de Cotonou" />
            </div>

            <Button type="submit" disabled={loading} className="w-full" size="lg">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
              Recevoir mon lien d'accès
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Le lien est valable 180 jours. Aucune publicité, aucun spam.
            </p>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-sm">
                {result.email_sent
                  ? <>Un email avec votre lien d'accès vient d'être envoyé. Vérifiez votre boîte (et le dossier <strong>spam</strong>).</>
                  : <>L'email n'a pas pu être envoyé — copiez et conservez ce lien personnel :</>}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Mon lien personnel</Label>
              <div className="flex gap-2">
                <Input readOnly value={result.tracking_url} className="font-mono text-xs" />
                <Button type="button" variant="outline" size="icon" onClick={copyLink}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <Button onClick={close} className="w-full" size="lg">
              Commencer un quiz
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default QuizGuestStartDialog;
