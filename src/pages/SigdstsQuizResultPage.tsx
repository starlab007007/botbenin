import React, { useState } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { Helmet } from '@/components/SEO';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Trophy, RotateCw, ArrowLeft, Download, CheckCircle2, XCircle, BookOpen } from 'lucide-react';
import { getQuizModule } from '@/data/sigdsts-quiz';
import { getMention, MENTION_LABEL } from '@/data/sigdsts-quiz/types';
import { generateCertificate } from '@/lib/quizCertificate';
import { getUserName, setUserName } from '@/lib/quizStorage';
import { getGuestProfile, getGuestToken, submitGuestAttempt } from '@/lib/quizGuestSync';
import { toast } from '@/hooks/use-toast';
import { Cloud } from 'lucide-react';

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

  const handleDownload = () => {
    if (!name.trim()) {
      toast({ title: 'Nom requis', description: 'Indiquez votre nom pour générer l\'attestation.', variant: 'destructive' });
      return;
    }
    setUserName(name.trim());
    generateCertificate({ userName: name.trim(), module, score, total, date: new Date() });
    // Marque l'attestation comme délivrée côté cloud
    if (hasGuestSync) {
      submitGuestAttempt({
        module_id: module.id,
        module_title: module.title,
        total_questions: total,
        score,
        mention,
        duration_seconds: state.duration,
        answers,
        certificate_issued: true,
      }).catch(() => {});
    }
    toast({ title: '🎓 Attestation générée', description: 'Téléchargement en cours…' });
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
              Indiquez votre nom complet pour générer votre attestation PDF officielle.
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
              <Button onClick={handleDownload} size="lg" className="bg-emerald-600 hover:bg-emerald-700">
                <Download className="w-4 h-4 mr-2" /> Télécharger PDF
              </Button>
            </div>
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
              return (
                <div key={a.questionId} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                  {a.correct ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium mb-1">
                      Q{idx + 1}. {q.question}
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
