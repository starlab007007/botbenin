/**
 * Types pour le module Quiz SIGDSTS
 * Toutes les questions sont basées exclusivement sur le Guide SIGDSTS Complet v11.0 (Mars 2026)
 */

export type QuizDifficulty = 'easy' | 'medium' | 'hard';

export interface QuizQuestion {
  /** Identifiant unique : ex "M01-Q07" */
  id: string;
  difficulty: QuizDifficulty;
  question: string;
  options: [string, string, string, string];
  /** Index de la bonne réponse (0-3) */
  correctIndex: 0 | 1 | 2 | 3;
  /** Justification courte (1-2 phrases) basée sur le guide */
  explanation: string;
  /** Référence section + page du Guide SIGDSTS v11.0 */
  guideRef: { section: string; page: number };
}

export interface QuizModule {
  id: string;
  /** Numéro d'ordre (1-10) */
  order: number;
  title: string;
  shortTitle: string;
  description: string;
  /** Section du guide (ex "§4") */
  guideSection: string;
  /** Plage de pages (ex "12-15") */
  guidePages: string;
  /** Émoji ou nom d'icône Lucide */
  icon: string;
  /** Couleur d'accent Tailwind (ex "from-red-500 to-orange-500") */
  gradient: string;
  /** Durée estimée en minutes */
  estimatedMinutes: number;
  questions: QuizQuestion[];
}

export interface QuizAttemptResult {
  moduleId: string;
  bestScore: number;
  totalQuestions: number;
  attempts: number;
  lastDate: string; // ISO
  completed: boolean;
  /** Dernier détail des réponses (pour résultat) */
  lastAnswers?: Array<{ questionId: string; selectedIndex: number; correct: boolean }>;
}

export type QuizMention = 'excellent' | 'good' | 'review';

export const getMention = (score: number, total: number): QuizMention => {
  const ratio = score / total;
  if (ratio >= 0.9) return 'excellent';
  if (ratio >= 0.7) return 'good';
  return 'review';
};

export const MENTION_LABEL: Record<QuizMention, string> = {
  excellent: 'Excellent',
  good: 'Bien',
  review: 'À revoir',
};
