# Embeddings : passage de toute la plateforme à `gemini-embedding-2`

Date : 29/09/2026 — branche `claude/harmonisation-phase-0-1`. Aucun déploiement ni écriture en base n'a été fait.

## Ce qui change dans le code
| Fichier | Changement |
|---|---|
| `supabase/functions/_shared/agent-ai.ts` | `EMBEDDING_MODEL` = `gemini-embedding-2` ; `embedText(text, taskType = "RETRIEVAL_QUERY")` ; contrôle des 768 dimensions ; normalisation L2 |
| `supabase/functions/waouh-agent-ingest/index.ts` | les fragments sont indexés avec `RETRIEVAL_DOCUMENT` (requêtes : `RETRIEVAL_QUERY`) |
| `supabase/functions/_shared/gemini.ts` | `geminiEmbedding` (aujourd'hui non appelée) aligné sur `gemini-embedding-2` |
| `supabase/functions/a/agent-ai-studio.ts` | déjà en `gemini-embedding-2` (768, normalisé) : aucun changement |
| `scripts/supabase/reindex-agent-chunks.mjs` | nouveau : ré-indexation des fragments existants (simulation par défaut) |

## État de la base (relevé le 29/09/2026, lecture seule)
- `waouh_ai_agent_chunks.embedding` : `vector(768)` ; **9 fragments, 7 agents**, tous vectorisés avec l'ancien modèle.
- `waouh_radar_signals.embedding` : `vector(768)`, **0** vecteur renseigné : rien à ré-indexer.
- `match_agent_chunks` utilise la distance cosinus (`<=>`).
- Les dimensions (768) ne changent pas : **aucune migration SQL**.

## Pourquoi il faut ré-indexer
Deux modèles d'embeddings ne partagent pas le même espace vectoriel. Une requête vectorisée avec `gemini-embedding-2`
comparée à des fragments vectorisés avec `gemini-embedding-001` donne des similarités sans signification.
`a` (Web Chat public) est déjà en `gemini-embedding-2` et complète par une recherche lexicale
(« until documents are re-indexed ») : ses réponses ne sont donc pas cassées, mais moins précises.

## Ordre de mise en œuvre recommandé (fenêtre d'incohérence : quelques secondes avec 9 fragments)
1. Relire et fusionner la branche.
2. Déployer **ensemble** : `waouh-agent-ingest`, `waouh-agent-chat`, `waouh-agent-webhook`
   (les seules fonctions qui appellent `embedText` directement ou via `runAgentTurn`).
   `waouh-agentic-core`, `waouh-agent-parse-catalog` et `waouh-studio-e2e-v21465` n'utilisent pas les embeddings : pas de redéploiement nécessaire.
3. Lancer aussitôt la ré-indexation :
   `node scripts/supabase/reindex-agent-chunks.mjs` (simulation), puis `--apply`.
4. Vérifier : `select count(*) from waouh_ai_agent_chunks where embedding is not null;` = 9, puis une question de test sur un agent documentaire.

## Retour arrière
Remettre `EMBEDDING_MODEL = "gemini-embedding-001"` et l'ancien `embedText`, redéployer les 3 fonctions, puis relancer le script avec
`GEMINI_EMBEDDING_MODEL=gemini-embedding-001` (le script lit cette variable ; tâche `RETRIEVAL_DOCUMENT`).

## Impact Web et Flutter
Aucun changement de contrat : mêmes fonctions, mêmes requêtes, mêmes réponses. **Aucune version Flutter ni Web à publier.**

| Fonction concernée | Web (`src/`) | Flutter (`flutter_waouh_app/lib/`) |
|---|---|---|
| `waouh-agent-chat` | `AgentsSection.tsx`, `CreateAgentWizard.tsx` (test d'agent) | `live_whatsapp_ia_agent_module.dart`, `whatsapp_ia_studio_v21/studio_compat_service.dart` |
| `waouh-agent-ingest` | `CreateAgentWizard.tsx` (ajout de connaissances) | `live_whatsapp_ia_agent_module.dart`, `smart_studio_service.dart` |
| `waouh-agent-webhook` | — (réponses WhatsApp, côté serveur) | — |
| `a` (Web Chat public) | `PublicAgentWebChatPage.tsx` → `/functions/v1/a` | — |

Effet visible : après ré-indexation, meilleure pertinence des réponses des agents à connaissances documentaires (site, documents, FAQ).
Pendant la fenêtre de bascule : réponses potentiellement moins ciblées, sans erreur pour l'utilisateur (le contexte vectoriel est facultatif dans `runAgentTurn`).
À tester après déploiement : création d'un agent + ajout d'un texte (Web et Flutter), question de test, Web Chat public d'un agent partagé.
