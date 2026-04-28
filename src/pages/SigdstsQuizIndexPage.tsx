import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from '@/components/SEO';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { GraduationCap, BookOpen, Trophy, ArrowLeft } from 'lucide-react';
import { QUIZ_MODULES, TOTAL_QUESTIONS } from '@/data/sigdsts-quiz';
import { QuizModuleCard } from '@/components/quiz/QuizModuleCard';
import { getAllResults } from '@/lib/quizStorage';

const SigdstsQuizIndexPage: React.FC = () => {
  const [results, setResults] = useState(getAllResults());

  useEffect(() => {
    const onStorage = () => setResults(getAllResults());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const completedCount = Object.values(results).filter((r) => r.completed).length;
  const globalBest = Object.values(results).reduce((sum, r) => sum + (r.bestScore ?? 0), 0);
  const globalRatio = Math.round((globalBest / TOTAL_QUESTIONS) * 100);

  return (
    <>
      <Helmet>
        <title>Quiz SIGDSTS — 200 QCM par modules | Bot.bj</title>
        <meta name="description" content="Formez-vous au SIGDSTS avec 200 QCM répartis sur 10 modules métier. Quiz progressif basé sur le Guide officiel v11.0. Sans inscription." />
        <link rel="canonical" href="https://bot.bj/sigdsts/quiz" />
      </Helmet>

      <div className="container mx-auto px-4 py-6 lg:py-10 max-w-7xl">
        <Link to="/sigdsts" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> Retour au support SIGDSTS
        </Link>

        {/* Hero */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-100">
              <GraduationCap className="w-3 h-3 mr-1" /> Formation interactive
            </Badge>
            <Badge variant="outline">Sans inscription</Badge>
          </div>
          <h1 className="text-3xl lg:text-5xl font-bold tracking-tight mb-3 bg-gradient-to-r from-emerald-700 to-blue-700 bg-clip-text text-transparent">
            Quiz de formation SIGDSTS
          </h1>
          <p className="text-base lg:text-lg text-muted-foreground max-w-3xl">
            {TOTAL_QUESTIONS} questions à choix multiples réparties sur {QUIZ_MODULES.length} modules métier.
            Difficulté progressive (facile → expert). Toutes les questions sont basées sur le
            <strong> Guide SIGDSTS Complet v11.0</strong>.
          </p>
        </div>

        {/* Stats globales */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{QUIZ_MODULES.length}</div>
                <div className="text-xs text-muted-foreground">Modules métier</div>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <GraduationCap className="w-8 h-8 text-emerald-600" />
              <div>
                <div className="text-2xl font-bold">{TOTAL_QUESTIONS}</div>
                <div className="text-xs text-muted-foreground">Questions QCM</div>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Trophy className="w-8 h-8 text-amber-500" />
              <div>
                <div className="text-2xl font-bold">{completedCount}/{QUIZ_MODULES.length}</div>
                <div className="text-xs text-muted-foreground">Modules réussis</div>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Progression globale</span>
                <span className="text-sm font-bold">{globalRatio}%</span>
              </div>
              <Progress value={globalRatio} className="h-2" />
              <p className="text-[11px] text-muted-foreground">{globalBest}/{TOTAL_QUESTIONS} pts</p>
            </div>
          </Card>
        </div>

        {/* Grid modules */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {QUIZ_MODULES.map((m) => (
            <QuizModuleCard key={m.id} module={m} result={results[m.id]} />
          ))}
        </div>

        <div className="mt-10 p-5 rounded-lg bg-muted/40 border text-sm text-muted-foreground">
          <p className="font-semibold mb-1 text-foreground">💡 Comment ça marche ?</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Choisissez un module ci-dessus</li>
            <li>Répondez aux 20 questions (vous voyez la correction immédiatement)</li>
            <li>Obtenez votre score et téléchargez votre attestation PDF si ≥ 70%</li>
            <li>Vos scores sont sauvegardés sur cet appareil — aucun compte requis</li>
          </ul>
        </div>
      </div>
    </>
  );
};

export default SigdstsQuizIndexPage;
