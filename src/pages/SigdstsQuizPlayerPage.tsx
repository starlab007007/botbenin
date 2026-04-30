import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, Navigate } from 'react-router-dom';
import { Helmet } from '@/components/SEO';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ArrowLeft, ArrowRight, CheckCircle2, XCircle, BookOpen } from 'lucide-react';
import { getQuizModule } from '@/data/sigdsts-quiz';
import { saveResult } from '@/lib/quizStorage';
import { getMention } from '@/data/sigdsts-quiz/types';
import { submitGuestAttempt, getGuestToken } from '@/lib/quizGuestSync';
import { QuestionTimer } from '@/components/quiz/QuestionTimer';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const TIME_PER_DIFFICULTY: Record<string, number> = { easy: 30, medium: 45, hard: 60 };
const REVEAL_DURATION_MS = 4500;

type AnswerLog = { questionId: string; selectedIndex: number; correct: boolean };

const SigdstsQuizPlayerPage: React.FC = () => {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();
  const module = moduleId ? getQuizModule(moduleId) : undefined;

  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState<AnswerLog[]>([]);
  const startedAt = useRef<number>(Date.now());
  const autoAdvanceRef = useRef<number | null>(null);
  const lockedQuestionRef = useRef<string | null>(null);
  const answersRef = useRef<AnswerLog[]>([]);
  answersRef.current = answers;

  if (!module) return <Navigate to="/sigdsts/quiz" replace />;

  const total = module.questions.length;
  const question = module.questions[currentIdx];
  const progress = ((currentIdx + (revealed ? 1 : 0)) / total) * 100;
  const timeLimit = TIME_PER_DIFFICULTY[question.difficulty] ?? 45;

  const finalize = useCallback(
    (finalAnswers: AnswerLog[]) => {
      const score = finalAnswers.filter((a) => a.correct).length;
      const duration = Math.round((Date.now() - startedAt.current) / 1000);
      const mention = getMention(score, total);

      saveResult({
        moduleId: module.id,
        bestScore: score,
        totalQuestions: total,
        attempts: 1,
        lastDate: new Date().toISOString(),
        completed: score / total >= 0.7,
        lastAnswers: finalAnswers,
      });

      if (getGuestToken()) {
        submitGuestAttempt({
          module_id: module.id,
          module_title: module.title,
          total_questions: total,
          score,
          mention,
          duration_seconds: duration,
          answers: finalAnswers,
          certificate_issued: false,
        }).catch(() => {});
      }

      navigate(`/sigdsts/quiz/${module.id}/result`, {
        state: { score, total, answers: finalAnswers, duration },
      });
    },
    [module, navigate, total],
  );

  const advance = useCallback(
    (newAnswers: AnswerLog[]) => {
      if (autoAdvanceRef.current) {
        window.clearTimeout(autoAdvanceRef.current);
        autoAdvanceRef.current = null;
      }
      lockedQuestionRef.current = null;
      if (currentIdx + 1 >= total) {
        finalize(newAnswers);
        return;
      }
      setCurrentIdx((i) => i + 1);
      setSelected(null);
      setRevealed(false);
    },
    [currentIdx, finalize, total],
  );

  const recordAnswer = useCallback(
    (idx: number | null): AnswerLog[] => {
      if (lockedQuestionRef.current === question.id) return answersRef.current;
      lockedQuestionRef.current = question.id;
      const correct = idx !== null && idx === question.correctIndex;
      const log: AnswerLog = {
        questionId: question.id,
        selectedIndex: idx ?? -1,
        correct,
      };
      const next = [...answersRef.current, log];
      setAnswers(next);
      return next;
    },
    [question],
  );

  const handleValidate = () => {
    if (selected === null || revealed) return;
    setRevealed(true);
    recordAnswer(selected);
  };

  const handleNext = () => {
    advance(answersRef.current);
  };

  const handleExpire = useCallback(() => {
    if (revealed) return;
    const questionId = question.id;
    if (selected !== null) {
      // Auto-validate user's selection
      setRevealed(true);
      recordAnswer(selected);
      toast('⏱️ Temps écoulé', { description: 'Réponse validée automatiquement.' });
    } else {
      // No answer chosen → mark unanswered, briefly reveal correct answer
      setRevealed(true);
      const newAnswers = recordAnswer(null);
      toast('⏱️ Temps écoulé', { description: 'Aucune réponse sélectionnée.' });
      autoAdvanceRef.current = window.setTimeout(() => {
        if (lockedQuestionRef.current === questionId) advance(newAnswers);
      }, REVEAL_DURATION_MS);
    }
  }, [revealed, selected, question.id, recordAnswer, advance]);

  // Cleanup auto-advance timer on unmount / question change
  useEffect(() => {
    return () => {
      if (autoAdvanceRef.current) {
        window.clearTimeout(autoAdvanceRef.current);
        autoAdvanceRef.current = null;
      }
    };
  }, [currentIdx]);

  const difficultyLabel = { easy: 'Facile', medium: 'Intermédiaire', hard: 'Expert' }[question.difficulty];
  const difficultyColor = {
    easy: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    medium: 'bg-amber-100 text-amber-700 border-amber-300',
    hard: 'bg-rose-100 text-rose-700 border-rose-300',
  }[question.difficulty];

  return (
    <>
      <Helmet>
        <title>{`Quiz ${module.title} — SIGDSTS | Bot.bj`}</title>
      </Helmet>

      <div className="container mx-auto px-4 py-6 lg:py-10 max-w-3xl">
        <Link to="/sigdsts/quiz" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> Quitter le quiz
        </Link>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline">Module {module.order}</Badge>
              <Badge className={cn('border', difficultyColor)} variant="outline">{difficultyLabel}</Badge>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                Question <strong className="text-foreground">{currentIdx + 1}</strong> / {total}
              </span>
              <QuestionTimer
                seconds={timeLimit}
                paused={revealed}
                resetKey={`${currentIdx}-${question.id}`}
                onExpire={handleExpire}
              />
            </div>
          </div>
          <h1 className="text-xl lg:text-2xl font-bold mb-3">{module.title}</h1>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Question */}
        <Card className="p-5 lg:p-6 mb-4">
          <p className="text-base lg:text-lg font-medium mb-5 leading-relaxed">{question.question}</p>

          <RadioGroup
            value={selected !== null ? String(selected) : ''}
            onValueChange={(v) => !revealed && setSelected(Number(v))}
            className="space-y-2"
          >
            {question.options.map((opt, idx) => {
              const isCorrect = idx === question.correctIndex;
              const isSelected = selected === idx;
              const showCorrect = revealed && isCorrect;
              const showWrong = revealed && isSelected && !isCorrect;
              return (
                <Label
                  key={idx}
                  htmlFor={`opt-${idx}`}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                    !revealed && 'hover:bg-muted/60',
                    isSelected && !revealed && 'border-primary bg-primary/5',
                    showCorrect && 'border-emerald-500 bg-emerald-50',
                    showWrong && 'border-rose-500 bg-rose-50',
                    revealed && !isCorrect && !isSelected && 'opacity-60',
                  )}
                >
                  <RadioGroupItem value={String(idx)} id={`opt-${idx}`} disabled={revealed} className="mt-0.5" />
                  <span className="flex-1 text-sm">{opt}</span>
                  {showCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
                  {showWrong && <XCircle className="w-5 h-5 text-rose-600 shrink-0" />}
                </Label>
              );
            })}
          </RadioGroup>

          {revealed && (
            <div className="mt-5 p-4 rounded-lg bg-muted/50 border-l-4 border-primary">
              <div className="flex items-start gap-2 mb-2">
                <BookOpen className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold mb-1">
                    {selected === null
                      ? '⏱️ Question non répondue'
                      : selected === question.correctIndex
                      ? '✅ Bonne réponse'
                      : '❌ Réponse incorrecte'}
                  </p>
                  <p className="text-sm text-muted-foreground">{question.explanation}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    📖 Référence : Guide SIGDSTS {question.guideRef.section} · page {question.guideRef.page}
                  </p>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          {!revealed ? (
            <Button onClick={handleValidate} disabled={selected === null} size="lg">
              Valider
            </Button>
          ) : (
            <Button onClick={handleNext} size="lg">
              {currentIdx + 1 >= total ? 'Voir le résultat' : 'Question suivante'}
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </>
  );
};

export default SigdstsQuizPlayerPage;
