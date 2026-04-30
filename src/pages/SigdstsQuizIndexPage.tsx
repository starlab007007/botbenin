import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from '@/components/SEO';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { GraduationCap, BookOpen, Trophy, ArrowLeft, Cloud, CloudOff, Mail, ExternalLink, LogOut } from 'lucide-react';
import { QUIZ_MODULES, TOTAL_QUESTIONS } from '@/data/sigdsts-quiz';
import { QuizModuleCard } from '@/components/quiz/QuizModuleCard';
import { getAllResults } from '@/lib/quizStorage';
import { getGuestToken, getGuestProfile, clearGuestToken } from '@/lib/quizGuestSync';
import { QuizGuestStartDialog } from '@/components/quiz/QuizGuestStartDialog';

const SigdstsQuizIndexPage: React.FC = () => {
  const [results, setResults] = useState(getAllResults());
  const [guestDialogOpen, setGuestDialogOpen] = useState(false);
  const [guestToken, setGuestTokenState] = useState<string | null>(getGuestToken());
  const [guestProfile, setGuestProfileState] = useState(getGuestProfile());

  useEffect(() => {
    const onStorage = () => {
      setResults(getAllResults());
      setGuestTokenState(getGuestToken());
      setGuestProfileState(getGuestProfile());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const refreshGuest = () => {
    setGuestTokenState(getGuestToken());
    setGuestProfileState(getGuestProfile());
  };

  const handleSignOut = () => {
    clearGuestToken();
    refreshGuest();
  };

  const visibleResults = QUIZ_MODULES.map((m) => results[m.id]).filter(Boolean);
  const completedCount = visibleResults.filter((r) => r.completed).length;
  const globalBest = visibleResults.reduce((sum, r) => sum + (r.bestScore ?? 0), 0);
  const globalRatio = Math.round((globalBest / TOTAL_QUESTIONS) * 100);

  return (
    <>
      <Helmet>
        <title>Quiz SIGDSTS — 135 QCM par modules | Bot.bj</title>
        <meta name="description" content="Formez-vous au SIGDSTS avec 135 QCM répartis sur 9 modules métier. Quiz progressif basé sur le Guide officiel v11.0. Sans inscription." />
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

        {/* Bandeau session guest */}
        {guestToken && guestProfile ? (
          <Card className="p-4 mb-6 bg-gradient-to-r from-violet-50 to-blue-50 border-violet-200 dark:from-violet-950/30 dark:to-blue-950/30">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-violet-600 text-white flex items-center justify-center font-bold shrink-0">
                  {guestProfile.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold truncate">{guestProfile.full_name}</p>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300">
                      <Cloud className="w-3 h-3 mr-1" /> Synchronisé
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{guestProfile.email}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link to={`/sigdsts/quiz/suivi/${guestToken}`}>
                    <ExternalLink className="w-3.5 h-3.5 mr-1" /> Mes résultats
                  </Link>
                </Button>
                <Button size="sm" variant="ghost" onClick={handleSignOut} title="Se déconnecter de cet appareil">
                  <LogOut className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="p-4 mb-6 border-dashed">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <CloudOff className="w-8 h-8 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Suivez vos évaluations sur tous vos appareils</p>
                  <p className="text-xs text-muted-foreground">Sans mot de passe — un simple lien magique par email</p>
                </div>
              </div>
              <Button onClick={() => setGuestDialogOpen(true)}>
                <Mail className="w-4 h-4 mr-2" /> Activer le suivi
              </Button>
            </div>
          </Card>
        )}

        <QuizGuestStartDialog
          open={guestDialogOpen}
          onOpenChange={setGuestDialogOpen}
          onSuccess={refreshGuest}
        />

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
            <li>Répondez aux 15 questions (vous voyez la correction immédiatement)</li>
            <li>Obtenez votre score et téléchargez votre attestation PDF si ≥ 70%</li>
            <li>Vos scores sont sauvegardés sur cet appareil — aucun compte requis</li>
          </ul>
        </div>
      </div>
    </>
  );
};

export default SigdstsQuizIndexPage;
