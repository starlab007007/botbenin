import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from '@/components/SEO';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, ShieldX, ArrowLeft, Loader2, Trophy, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { verifyCertificate } from '@/lib/quizGuestSync';
import { MENTION_LABEL } from '@/data/sigdsts-quiz/types';

type VerifyState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'valid'; cert: any }
  | { kind: 'invalid'; reason: string };

const SigdstsCertificateVerifyPage: React.FC = () => {
  const { code: paramCode } = useParams<{ code: string }>();
  const [code, setCode] = useState(paramCode ?? '');
  const [state, setState] = useState<VerifyState>({ kind: 'idle' });

  const runVerify = async (c: string) => {
    const cleaned = c.trim().toUpperCase();
    if (!cleaned) return;
    setState({ kind: 'loading' });
    try {
      const r = await verifyCertificate(cleaned);
      if (r.status === 'valid') {
        setState({ kind: 'valid', cert: r.certificate });
      } else if (r.status === 'not_found') {
        setState({ kind: 'invalid', reason: 'Aucune attestation trouvée pour ce code.' });
      } else if (r.status === 'invalid_format') {
        setState({ kind: 'invalid', reason: 'Format de code invalide. Format attendu : SIG-AAAA-XXXXXXXX' });
      } else if (r.status === 'rate_limited') {
        setState({ kind: 'invalid', reason: 'Trop de vérifications, réessayez dans une minute.' });
      } else {
        setState({ kind: 'invalid', reason: r.error ?? 'Erreur de vérification' });
      }
    } catch (e: any) {
      setState({ kind: 'invalid', reason: e?.message ?? 'Erreur réseau' });
    }
  };

  useEffect(() => {
    if (paramCode) runVerify(paramCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramCode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runVerify(code);
  };

  return (
    <>
      <Helmet>
        <title>Vérification d'attestation SIGDSTS | Bot.bj</title>
        <meta name="description" content="Vérifiez l'authenticité d'une attestation de formation SIGDSTS à partir de son numéro." />
      </Helmet>

      <div className="container mx-auto px-4 py-8 lg:py-12 max-w-2xl">
        <Link to="/sigdsts/quiz" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" /> Espace quiz SIGDSTS
        </Link>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold mb-2">Vérification d'attestation SIGDSTS</h1>
          <p className="text-muted-foreground text-sm">
            Saisissez le numéro figurant sur l'attestation pour vérifier son authenticité.
          </p>
        </div>

        <Card className="p-5 mb-6">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="SIG-2026-XXXXXXXX"
              className="font-mono uppercase"
              maxLength={32}
            />
            <Button type="submit" disabled={state.kind === 'loading'}>
              {state.kind === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span className="ml-1.5 hidden sm:inline">Vérifier</span>
            </Button>
          </form>
        </Card>

        {state.kind === 'loading' && (
          <Card className="p-6 text-center text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            Vérification en cours...
          </Card>
        )}

        {state.kind === 'invalid' && (
          <Card className="p-6 border-rose-300 bg-rose-50/60">
            <div className="flex items-start gap-3">
              <ShieldX className="w-8 h-8 text-rose-600 shrink-0" />
              <div>
                <h2 className="font-bold text-lg text-rose-900">Attestation non valide</h2>
                <p className="text-sm text-rose-800 mt-1">{state.reason}</p>
              </div>
            </div>
          </Card>
        )}

        {state.kind === 'valid' && (
          <Card className="p-6 border-emerald-300 bg-emerald-50/60">
            <div className="flex items-start gap-3 mb-4">
              <ShieldCheck className="w-10 h-10 text-emerald-600 shrink-0" />
              <div className="flex-1">
                <h2 className="font-bold text-xl text-emerald-900">Attestation authentique</h2>
                <p className="text-sm text-emerald-800">Délivrée par la plateforme SIGDSTS — Bot.bj</p>
              </div>
            </div>

            <div className="space-y-3 bg-white rounded-lg p-4 border border-emerald-200">
              <Field label="Titulaire" value={state.cert.holder_name ?? '—'} strong />
              <Field label="Module" value={state.cert.module_title} />
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Score"
                  value={`${state.cert.score}/${state.cert.total_questions} (${Math.round(state.cert.ratio * 100)}%)`}
                />
                <Field label="Mention">
                  <Badge className="bg-emerald-600 hover:bg-emerald-600">
                    <Trophy className="w-3 h-3 mr-1" />
                    {MENTION_LABEL[state.cert.mention as keyof typeof MENTION_LABEL] ?? state.cert.mention}
                  </Badge>
                </Field>
              </div>
              <Field
                label="Date d'émission"
                value={new Date(state.cert.certificate_issued_at).toLocaleDateString('fr-FR', {
                  day: '2-digit', month: 'long', year: 'numeric',
                })}
              />
              <Field label="N° d'attestation" value={state.cert.certificate_code} mono />
            </div>

            <p className="text-xs text-muted-foreground mt-4 text-center">
              Cette vérification garantit que l'attestation a bien été délivrée par notre plateforme.
              Aucune donnée personnelle au-delà du nom du titulaire n'est exposée.
            </p>
          </Card>
        )}
      </div>
    </>
  );
};

const Field: React.FC<{ label: string; value?: string; strong?: boolean; mono?: boolean; children?: React.ReactNode }> = ({
  label, value, strong, mono, children,
}) => (
  <div className="flex justify-between items-center gap-3 text-sm">
    <span className="text-muted-foreground">{label}</span>
    {children ?? (
      <span className={`text-right ${strong ? 'font-semibold' : ''} ${mono ? 'font-mono text-xs' : ''}`}>
        {value}
      </span>
    )}
  </div>
);

export default SigdstsCertificateVerifyPage;
