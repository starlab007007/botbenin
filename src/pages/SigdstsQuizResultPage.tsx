import React, { useState } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { Helmet } from '@/components/SEO';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Trophy, RotateCw, ArrowLeft, Download, CheckCircle2, XCircle, BookOpen, Copy, ShieldCheck, Loader2 } from 'lucide-react';
import { getQuizModule } from '@/data/sigdsts-quiz';
import { getMention, MENTION_LABEL } from '@/data/sigdsts-quiz/types';
import { generateCertificate } from '@/lib/quizCertificate';
import { getUserName, setUserName } from '@/lib/quizStorage';
import { getGuestProfile, getGuestToken, submitGuestAttempt } from '@/lib/quizGuestSync';
import { toast } from 'sonner';

interface LocationState {
  score: number;
  total: number;
  duration?: number;
  answers: Array<{ questionId: string; selectedIndex: number; correct: boolean }>;
}

const SigdstsQuizResultPage: React.FC = () => {
  const { moduleId } = useParams<{ moduleId: string }>();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const module = moduleId ? getQuizModule(moduleId) : undefined;
  const guestProfile = getGuestProfile();
  const hasGuestSync = !!getGuestToken();
  const [name, setName] = useState(getUserName() || guestProfile?.full_name || '');
  const [generating, setGenerating] = useState(false);
  const [issued, setIssued] = useState<{ code: string; verifyUrl: string } | null>(null);

  if (!module || !state) return <Navigate to={`/sigdsts/quiz/${moduleId ?? ''}`} replace />;

  const { score, total, answers } = state;
  const ratio = Math.round((score / total) * 100);
  const mention = getMention(score, total);
  const eligible = ratio >= 70;

  const mentionStyles: Record<string, string> = {
    excellent: 'from-emerald-500 to-emerald-700',
    good: 'from-blue-500 to-blue-700',
    review: 'from-amber-500 to-orange-600',
  };

  const handleDownload = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('Nom requis', { description: "Indiquez votre nom pour générer l'attestation." });
      return;
    }
    setUserName(trimmed);
    setGenerating(true);
    try {
      let certificateCode: string | null = null;
      let verifyUrl: string | null = null;

      if (hasGuestSync) {
        const result = await submitGuestAttempt({
          module_id: module.id,
          module_title: module.title,
          total_questions: total,
          score,
          mention,
          duration_seconds: state.duration,
          answers,
          certificate_issued: true,
          holder_name: trimmed,
        });
        if (result?.certificate_code) {
          certificateCode = result.certificate_code;
          verifyUrl = result.verify_url;
          setIssued({ code: result.certificate_code, verifyUrl: result.verify_url ?? '' });
        }
      } else {
        // Local fallback (non vérifiable officiellement)
        const year = new Date().getFullYear();
        const rand = Math.random().toString(36).slice(2, 10).toUpperCase();
        certificateCode = `LOCAL-${year}-${rand}`;
      }

      await generateCertificate({
        userName: trimmed,
        module,
        score,
        total,
        date: new Date(),
        certificateCode,
        verifyUrl,
      });

      toast.success('🎓 Attestation générée', {
        description: hasGuestSync
          ? `N° ${certificateCode} — vérifiable en ligne`
          : 'Attestation locale (créez un espace pour la rendre vérifiable)',
      });
    } catch (e: any) {
      toast.error('Échec de la génération', { description: e?.message ?? 'Erreur inconnue' });
    } finally {
      setGenerating(false);
    }
  };

  const copyCode = () => {
    if (!issued) return;
    navigator.clipboard.writeText(issued.code);
    toast.success('Code copié');
  };
  const copyVerifyUrl = () => {
    if (!issued?.verifyUrl) return;
    navigator.clipboard.writeText(issued.verifyUrl);
    toast.success('Lien de vérification copié');
  };

  return (
    <>
      <Helmet>
        <title>{`Résultat — ${module.title} | Quiz SIGDSTS`}</title>
      </Helmet>

      <div className="container mx-auto px-4 py-6 lg:py-10 max-w-3xl">
        <Link to="/sigdsts/quiz" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> Tous les modules
        </Link>

        {/* Score hero */}
        <Card className={`p-6 lg:p-8 mb-6 text-white bg-gradient-to-br ${mentionStyles[mention]}`}>
          <div className="flex items-center justify-center mb-4">
            <Trophy className="w-16 h-16" />
          </div>
          <div className="text-center">
            <Badge variant="outline" className="bg-white/20 text-white border-white/40 mb-3">
              Module {module.order} — {module.title}
            </Badge>
            <div className="text-5xl lg:text-6xl font-bold mb-2">{ratio}%</div>
            <p className="text-xl mb-1">{score} / {total} bonnes réponses</p>
            <p className="text-2xl font-semibold mt-3">Mention : {MENTION_LABEL[mention]}</p>
          </div>
        </Card>

        {/* Certificate */}
        {eligible ? (
          <Card className="p-5 mb-6 border-emerald-300 bg-emerald-50/50">
            <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
              🎓 Attestation de formation disponible
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Indiquez votre nom complet pour générer votre attestation PDF officielle{hasGuestSync ? ' avec QR code de vérification' : ''}.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Label htmlFor="name" className="sr-only">Nom complet</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: KOUASSI Marie-Joséphine"
                />
              </div>
              <Button onClick={handleDownload} disabled={generating} size="lg" className="bg-emerald-600 hover:bg-emerald-700">
                {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                Télécharger PDF
              </Button>
            </div>

            {issued && (
              <div className="mt-4 rounded-lg border border-emerald-200 bg-white p-4 space-y-3">
                <div className="flex items-center gap-2 text-emerald-700">
                  <ShieldCheck className="w-5 h-5" />
                  <span className="font-semibold text-sm">Attestation officielle vérifiable</span>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">N° d'attestation</Label>
                  <div className="flex gap-2">
                    <Input readOnly value={issued.code} className="font-mono text-sm" />
                    <Button type="button" variant="outline" size="icon" onClick={copyCode}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {issued.verifyUrl && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Lien de vérification</Label>
                    <div className="flex gap-2">
                      <Input readOnly value={issued.verifyUrl} className="font-mono text-xs" />
                      <Button type="button" variant="outline" size="icon" onClick={copyVerifyUrl}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Toute personne (RH, recruteur) peut vérifier l'authenticité via ce lien ou en scannant le QR code du PDF.
                    </p>
                  </div>
                )}
              </div>
            )}

            {!hasGuestSync && (
              <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                ⚠️ Sans espace de formation, l'attestation est générée localement et n'est pas vérifiable en ligne. Créez un espace depuis la page d'accueil du quiz pour obtenir une attestation officielle.
              </p>
            )}
          </Card>
        ) : (
          <Card className="p-5 mb-6 border-amber-300 bg-amber-50/50">
            <h3 className="font-bold text-lg mb-1">📚 Score insuffisant pour l'attestation</h3>
            <p className="text-sm text-muted-foreground">
              Il faut au minimum 70% (soit {Math.ceil(total * 0.7)}/{total}) pour obtenir l'attestation.
              Relisez la section <strong>{module.guideSection}</strong> du Guide (pages {module.guidePages}) puis retentez le quiz.
            </p>
          </Card>
        )}

        {/* Détail réponses */}
        <Card className="p-5 mb-6">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5" /> Détail des réponses
          </h3>
          <div className="space-y-2">
            {answers.map((a, idx) => {
              const q = module.questions.find((q) => q.id === a.questionId);
              if (!q) return null;
              const unanswered = a.selectedIndex < 0;
              return (
                <div key={a.questionId} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                  {a.correct ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className={`w-5 h-5 shrink-0 mt-0.5 ${unanswered ? 'text-amber-600' : 'text-rose-600'}`} />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium mb-1">
                      Q{idx + 1}. {q.question}
                      {unanswered && <span className="ml-2 text-xs text-amber-700">(non répondue)</span>}
                    </p>
                    {!a.correct && (
                      <p className="text-xs text-emerald-700">
                        ✅ Bonne réponse : {q.options[q.correctIndex]}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      📖 {q.guideRef.section} · p.{q.guideRef.page}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Progress global */}
        <div className="mb-6 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Score</span>
            <span className="font-semibold">{score}/{total}</span>
          </div>
          <Progress value={ratio} />
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          <Button asChild variant="outline">
            <Link to="/sigdsts/quiz">
              <ArrowLeft className="w-4 h-4 mr-1" /> Autres modules
            </Link>
          </Button>
          <Button asChild>
            <Link to={`/sigdsts/quiz/${module.id}`}>
              <RotateCw className="w-4 h-4 mr-1" /> Refaire ce quiz
            </Link>
          </Button>
        </div>
      </div>
    </>
  );
};

export default SigdstsQuizResultPage;
