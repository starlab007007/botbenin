import type { QuizAttemptResult } from '@/data/sigdsts-quiz/types';

const KEY = 'sigdsts_quiz_results_v1';
const NAME_KEY = 'sigdsts_quiz_user_name';

export const getAllResults = (): Record<string, QuizAttemptResult> => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
};

export const getResult = (moduleId: string): QuizAttemptResult | undefined =>
  getAllResults()[moduleId];

export const saveResult = (result: QuizAttemptResult) => {
  const all = getAllResults();
  const prev = all[result.moduleId];
  all[result.moduleId] = {
    ...result,
    attempts: (prev?.attempts ?? 0) + 1,
    bestScore: Math.max(prev?.bestScore ?? 0, result.bestScore),
    completed: prev?.completed || result.completed,
  };
  localStorage.setItem(KEY, JSON.stringify(all));
  return all[result.moduleId];
};

export const getUserName = (): string => localStorage.getItem(NAME_KEY) || '';
export const setUserName = (name: string) => localStorage.setItem(NAME_KEY, name);
