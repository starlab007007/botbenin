import { QuizModule } from './types';
import { module01Questions } from './module-01-accueil';
import { module02Questions } from './module-02-selection';
import { module03Questions } from './module-03-prelevement';
import { module04Questions } from './module-04-preparation';
import { module05Questions } from './module-05-qualification';
import { module06Questions } from './module-06-tri-validation';
import { module07Questions } from './module-07-destruction';
import { module08Questions } from './module-08-stock-transfert';
import { module09Questions } from './module-09-distribution';

export * from './types';

const firstFifteen = (questions: QuizModule['questions']) => questions.slice(0, 15);

/**
 * Modules de quiz SIGDSTS — 9 modules × 15 questions = 135 QCM
 * Source unique : Guide SIGDSTS Complet v11.0 (Mars 2026)
 */
export const QUIZ_MODULES: QuizModule[] = [
  {
    id: 'accueil-donneur',
    order: 1,
    title: 'Accueil Donneur',
    shortTitle: 'Accueil',
    description: "Enregistrement des donneurs via la fiche pré-don : recherche, état civil, photo, validation.",
    guideSection: '§4',
    guidePages: '12-15',
    icon: 'UserPlus',
    gradient: 'from-rose-500 to-orange-500',
    estimatedMinutes: 10,
    questions: firstFifteen(module01Questions),
  },
  {
    id: 'selection-medicale',
    order: 2,
    title: 'Sélection Médicale',
    shortTitle: 'Sélection',
    description: "Questionnaire médical, examen clinique et décision d'aptitude au don.",
    guideSection: '§5',
    guidePages: '16-20',
    icon: 'Stethoscope',
    gradient: 'from-blue-500 to-cyan-500',
    estimatedMinutes: 10,
    questions: firstFifteen(module02Questions),
  },
  {
    id: 'prelevement',
    order: 3,
    title: 'Prélèvement',
    shortTitle: 'Prélèvement',
    description: "Génération de numéros de poche, enregistrement du prélèvement et impression du code-barres.",
    guideSection: '§6',
    guidePages: '21-24',
    icon: 'Syringe',
    gradient: 'from-red-500 to-pink-600',
    estimatedMinutes: 10,
    questions: firstFifteen(module03Questions),
  },
  {
    id: 'preparation-psl',
    order: 4,
    title: 'Préparation des PSL',
    shortTitle: 'Préparation',
    description: "Fractionnement de la poche mère en produits dérivés (CGR, PFC, CPS, ST).",
    guideSection: '§7',
    guidePages: '25-26',
    icon: 'FlaskConical',
    gradient: 'from-purple-500 to-indigo-600',
    estimatedMinutes: 10,
    questions: firstFifteen(module04Questions),
  },
  {
    id: 'qualification-biologique',
    order: 5,
    title: 'Qualification Biologique',
    shortTitle: 'Qualification',
    description: "Sérologie (4 marqueurs), hématologie et double groupage sanguin par 2 agents.",
    guideSection: '§8',
    guidePages: '27-35',
    icon: 'Microscope',
    gradient: 'from-emerald-500 to-teal-600',
    estimatedMinutes: 12,
    questions: firstFifteen(module05Questions),
  },
  {
    id: 'tri-validation',
    order: 6,
    title: 'Tri & Validation',
    shortTitle: 'Tri',
    description: "Analyse physique macroscopique et décision finale (VALIDE / NON CONFORME).",
    guideSection: '§9',
    guidePages: '36-38',
    icon: 'CheckSquare',
    gradient: 'from-amber-500 to-yellow-600',
    estimatedMinutes: 10,
    questions: firstFifteen(module06Questions),
  },
  {
    id: 'destruction',
    order: 7,
    title: 'Destruction de Produit',
    shortTitle: 'Destruction',
    description: "Mise au rebut, génération du PV officiel et suivi des durées de péremption.",
    guideSection: '§10',
    guidePages: '39-40',
    icon: 'Trash2',
    gradient: 'from-slate-600 to-zinc-700',
    estimatedMinutes: 10,
    questions: firstFifteen(module07Questions),
  },
  {
    id: 'stock-transfert',
    order: 8,
    title: 'Stock & Transfert PSL',
    shortTitle: 'Stock',
    description: "Inventaire, fiche de transfert ANTS, expédition et réception entre BDS.",
    guideSection: '§11',
    guidePages: '41-44',
    icon: 'Truck',
    gradient: 'from-sky-500 to-blue-600',
    estimatedMinutes: 10,
    questions: firstFifteen(module08Questions),
  },
  {
    id: 'distribution',
    order: 9,
    title: 'Distribution des PSL',
    shortTitle: 'Distribution',
    description: "Distribution via BDS, BS périphérique, demande nominative (FDN) et transfusion.",
    guideSection: '§12',
    guidePages: '45-52',
    icon: 'Hospital',
    gradient: 'from-fuchsia-500 to-pink-600',
    estimatedMinutes: 12,
    questions: firstFifteen(module09Questions),
  },
];

export const getQuizModule = (id: string): QuizModule | undefined =>
  QUIZ_MODULES.find((m) => m.id === id);

export const TOTAL_QUESTIONS = QUIZ_MODULES.reduce((sum, m) => sum + m.questions.length, 0);
