import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import * as Icons from 'lucide-react';
import { ArrowRight, Clock, Trophy } from 'lucide-react';
import type { QuizModule, QuizAttemptResult } from '@/data/sigdsts-quiz/types';

interface Props {
  module: QuizModule;
  result?: QuizAttemptResult;
}

export const QuizModuleCard: React.FC<Props> = ({ module, result }) => {
  const Icon = (Icons as any)[module.icon] || Icons.BookOpen;
  const score = result?.bestScore ?? 0;
  const total = module.questions.length;
  const ratio = total > 0 ? Math.round((score / total) * 100) : 0;
  const completed = result?.completed;

  return (
    <Card className="group relative overflow-hidden border bg-card hover:shadow-lg transition-all">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${module.gradient}`} />
      <div className="p-5 flex flex-col gap-4 h-full">
        <div className="flex items-start justify-between gap-3">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${module.gradient} flex items-center justify-center text-white shadow-md`}>
            <Icon className="w-6 h-6" />
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant="outline" className="text-xs">Module {module.order}</Badge>
            <Badge variant="secondary" className="text-xs">
              <Clock className="w-3 h-3 mr-1" /> ~{module.estimatedMinutes} min
            </Badge>
          </div>
        </div>

        <div className="flex-1">
          <h3 className="font-semibold text-lg leading-tight mb-1">{module.title}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2">{module.description}</p>
          <p className="text-xs text-muted-foreground mt-2">
            Guide {module.guideSection} · p.{module.guidePages} · {total} questions
          </p>
        </div>

        {result && result.attempts > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Meilleur score</span>
              <span className="font-semibold flex items-center gap-1">
                {completed && <Trophy className="w-3 h-3 text-amber-500" />}
                {score}/{total} ({ratio}%)
              </span>
            </div>
            <Progress value={ratio} className="h-1.5" />
            <p className="text-[11px] text-muted-foreground">
              {result.attempts} tentative{result.attempts > 1 ? 's' : ''}
            </p>
          </div>
        )}

        <Button asChild className="w-full group/btn">
          <Link to={`/sigdsts/quiz/${module.id}`}>
            {result?.attempts ? 'Refaire le quiz' : 'Commencer'}
            <ArrowRight className="w-4 h-4 ml-1 group-hover/btn:translate-x-0.5 transition-transform" />
          </Link>
        </Button>
      </div>
    </Card>
  );
};
