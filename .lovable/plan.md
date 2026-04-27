
# Quiz Interactif SIGDSTS — 200 questions basées sur le Guide Officiel

## Vision
Ajouter un module de formation auto-évaluative à `/sigdsts/quiz` qui transforme le Guide SIGDSTS Complet (PDF officiel v11.0) en parcours pédagogique. **10 modules métier × 20 QCM = 200 questions**, difficulté progressive (facile → expert), correction immédiate avec citation de la page du guide.

Accessible **sans connexion** (comme Ticket Express) — les agents ANTS/BDS sur le terrain peuvent s'auto-évaluer instantanément. Score local stocké dans `localStorage` (pas de backend requis pour la v1).

---

## Périmètre — 10 modules métier (200 questions)

Source unique : `public/docs/Guide_SIGDSTS_COMPLET.pdf` (v11.0, Mars 2026)

| # | Module | Source guide | Thèmes 20 QCM |
|---|--------|--------------|---------------|
| 1 | **Accueil Donneur** | §4 (p.12-15) | Recherche donneur, Fiche Pré-Don, état civil, photo, validation |
| 2 | **Sélection Médicale** | §5 (p.16-20) | Questionnaire, examen, critères d'ajournement, décision |
| 3 | **Prélèvement** | §6 (p.21-24) | Numéros de poche, enregistrement, code-barres |
| 4 | **Préparation des PSL** | §7 (p.25-26) | Produits dérivés, étiquetage, traçabilité |
| 5 | **Qualification Biologique** | §8 (p.27-35) | Sérologie, Hématologie, Groupage Agent 1/2, finalisation |
| 6 | **Tri & Validation** | §9 (p.36-38) | Analyse physique, statuts, fiche QR code |
| 7 | **Destruction de Produit** | §10 (p.39-40) | Onglets, motifs, procédure |
| 8 | **Stock & Transfert PSL** | §11 (p.41-44) | Stock production, fiche transfert, réception |
| 9 | **Distribution des PSL** | §12 (p.45-52) | BDS, BS périphérique, FDN, transfusion, FEIR |
| 10 | **Administration** | §13 (p.53-68) | Paramètres, banques, utilisateurs, rôles, rapports |

Chaque QCM = 4 options, 1 bonne réponse, justification + référence page.

---

## Expérience utilisateur

### Page d'accueil quiz `/sigdsts/quiz`
- Hero : « Testez vos connaissances SIGDSTS — 100% basé sur le Guide officiel v11.0 »
- Grille 10 cartes (1 par module) avec : icône, titre, nb questions, durée estimée (~10 min), badge difficulté
- Bouton « Commencer » sur chaque carte
- Statistiques personnelles (localStorage) : modules complétés, meilleur score
- CTA secondaire : « Lire le Guide » (lien `/sigdsts/guide`)

### Page de quiz `/sigdsts/quiz/:moduleId`
- Barre de progression (1/20, 2/20, …)
- Question + 4 options radio (mobile-friendly, gros boutons tactiles)
- Bouton « Valider »
- Après validation :
  - ✅ vert si correcte / ❌ rouge si fausse + bonne réponse mise en évidence
  - **Justification courte** + « 📖 Voir Guide §X.Y page Z »
  - Bouton « Question suivante »
- Difficulté progressive : Q1-7 facile, Q8-14 intermédiaire, Q15-20 expert

### Écran de résultats `/sigdsts/quiz/:moduleId/result`
- Score X/20 avec barre circulaire
- Mention : Excellent (≥18), Bien (≥14), À revoir (<14)
- Liste des questions ratées avec rappel guide
- Boutons : « Refaire », « Module suivant », « Télécharger attestation PDF » (génération côté client avec jsPDF)

### Responsive mobile (rappel mémoire projet)
- `max-h-[100dvh]` pour pleine hauteur
- Cartes empilées verticalement <768px
- Boutons tactiles ≥48px

---

## Architecture technique

### Banque de questions — fichiers TS statiques
```
src/data/sigdsts-quiz/
├── index.ts                    // export consolidé + types
├── types.ts                    // QuizQuestion, QuizModule, QuizResult
├── module-01-accueil.ts        // 20 questions
├── module-02-selection.ts
├── module-03-prelevement.ts
├── module-04-preparation.ts
├── module-05-qualification.ts
├── module-06-tri-validation.ts
├── module-07-destruction.ts
├── module-08-stock-transfert.ts
├── module-09-distribution.ts
└── module-10-administration.ts
```

Type :
```ts
export interface QuizQuestion {
  id: string;                    // "M01-Q07"
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanation: string;           // 1-2 phrases
  guideRef: { section: string; page: number };
}
```

### Composants React
```
src/components/quiz/
├── QuizModuleCard.tsx          // carte sur la page d'accueil
├── QuizPlayer.tsx              // logique question/réponse
├── QuizQuestion.tsx            // affichage 1 question
├── QuizProgress.tsx            // barre de progression
├── QuizResult.tsx              // écran de fin
├── QuizScoreBadge.tsx          // mention Excellent/Bien/…
└── QuizCertificatePDF.tsx      // génération attestation
```

### Pages
```
src/pages/SupportQuizHomePage.tsx           // /sigdsts/quiz
src/pages/SupportQuizPlayerPage.tsx         // /sigdsts/quiz/:moduleId
src/pages/SupportQuizResultPage.tsx         // /sigdsts/quiz/:moduleId/result
```

### Routes ajoutées dans `App.tsx`
```tsx
<Route path="/sigdsts/quiz" element={<SupportQuizHomePage />} />
<Route path="/sigdsts/quiz/:moduleId" element={<SupportQuizPlayerPage />} />
<Route path="/sigdsts/quiz/:moduleId/result" element={<SupportQuizResultPage />} />
```

### Persistance — localStorage uniquement (v1, sans backend)
```ts
// clé : sigdsts_quiz_results
{
  "module-01": { bestScore: 18, attempts: 3, lastDate: "2026-04-27", completed: true },
  ...
}
```

Pas de migration Supabase nécessaire pour la v1. Si plus tard on veut un classement/badge officiel, on pourra ajouter une table `quiz_attempts` (à proposer en v2).

### Intégration `/sigdsts`
Ajout d'un nouveau bloc dans `SupportTechniquePage.tsx` :
> 🎓 **Auto-évaluation** — Testez vos connaissances sur les 10 modules SIGDSTS — Sans inscription requise — [Commencer]

---

## Génération du contenu (200 QCM)

Étant donné la volumétrie (200 questions hautement spécialisées sur transfusion sanguine), je vais procéder en deux passes :

1. **Re-parser le PDF en profondeur** (incluant pages 27-50 et au-delà) section par section pour extraire les éléments factuels précis (procédures, champs, codes, durées de péremption, rôles).
2. **Rédiger les 20 QCM par module** en se basant strictement sur le contenu extrait — chaque question référence explicitement une section du guide. Aucune invention : si le guide ne couvre pas un aspect, je n'invente pas.

Exemple de question typique (Module 6 — Prélèvement) :
> **Q3 (facile)** — Avant d'enregistrer un prélèvement, quelle action préalable est obligatoire ?
> - A) Imprimer le code-barres
> - B) Générer des numéros de poche ✅
> - C) Valider la fiche FEIR
> - D) Activer le QR code donneur
>
> *Justification : Le guide §6.1 indique que la génération des numéros de poche est un prérequis avant tout enregistrement.*
> *📖 Guide SIGDSTS §6.1, page 21*

---

## Livrables

1. 13 fichiers de données (`src/data/sigdsts-quiz/*.ts`)
2. 7 composants React (`src/components/quiz/*.tsx`)
3. 3 nouvelles pages
4. 3 routes ajoutées
5. 1 carte CTA ajoutée sur `SupportTechniquePage`
6. Génération PDF d'attestation client-side (réutilise `jsPDF` déjà présent)

## Hors scope (pour itérations futures)
- Classement multi-utilisateurs / leaderboard
- Mode examen chronométré avec lock
- Intégration aux statistiques admin
- Quiz adaptatif IA basé sur l'historique
- Modules non-métier (Introduction, Interface, Dépannage, Support)

---

## Ce qui se passera après votre approbation
1. Ré-extraction approfondie des sections 4 à 13 du PDF
2. Rédaction des 200 QCM par lot (20/module), en commençant par les modules 1-5 puis 6-10
3. Implémentation des composants et pages
4. Test responsive mobile + correction visuelle
5. Ajout du CTA sur `/sigdsts`
