
# Module « Après BAC IA » — Chat étudiant + Back-office admin

## Constat
La DB `apresbac_*` est déjà scaffoldée (615 programmes, 1368 anomalies, 1 doc de référence, 1 profil étudiant), mais **il n'existe aucun code** : 0 route front, 0 edge function, 0 message enregistré. On construit donc le module complet en s'appuyant sur ce schéma.

## Périmètre

### 1. App étudiant `/app/apres-bac`
- **Page d'accueil** : bandeau série BAC (A1/A2/B/C/D/E/F/G/H), moyenne saisie/OCR, mention. Bouton "Nouvelle conversation".
- **Chat IA orientation** : composant `ApresBacChat.tsx` basé sur nos patterns chat (parts, streaming), avec :
  - Sélecteur série BAC en tête de conversation (`apresbac_chat_sessions.bac_series`).
  - Rendu markdown des réponses + affichage inline des sources citées (programme, page PDF, extrait).
  - Bouton "Importer mon relevé" (OCR).
- **OCR relevé de notes** : dialogue "Import relevé" → upload image/PDF → edge function `apresbac-ocr` (Gemini Vision) qui remplit `apresbac_ocr_extractions` puis propose validation des matières/notes détectées, écrit dans `apresbac_student_subject_results` (confirmed=true après revue).
- **Profil étudiant** : `apresbac_student_profiles` mis à jour (série, moyenne, mention, consent_store_ocr_text).

### 2. Edge functions (Deno / Gemini via LOVABLE_API_KEY)
- `apresbac-chat` : reçoit `{ session_id, message, bac_series }`.
  1. Charge le profil + notes confirmées de l'utilisateur.
  2. RAG : requête SQL sur `apresbac_program_records` filtrée par `bac_series` (JSONB `?|`), scoring par pertinence texte (`ts_rank` sur program_name/outcomes/occupations).
  3. Appelle Gemini 2.5 Flash avec system prompt "orientation post-BAC Bénin" + top-K programmes en contexte + historique tronqué.
  4. Persiste user + assistant messages dans `apresbac_chat_messages`, écrit les sources citées dans `apresbac_chat_sources` (record_id → programme, document_id, page, extrait, score).
  5. Écrit tool calls éventuels (recherche filière, éligibilité) dans `apresbac_chat_tool_calls`.
  6. Retourne réponse + sources.
- `apresbac-ocr` : Gemini Vision → parse notes → `apresbac_ocr_extractions` + suggestions à confirmer.
- `apresbac-eligibility` : outil interne (utilisé par le chat) qui calcule pour un `program_id` + série + moyenne si l'étudiant est éligible (via `bac_series`, `special_rules`, `subjects_by_series`).

### 3. Back-office admin `/admin/apresbac` (AdminRoute)
Page `AdminApresBacPage.tsx` avec **KPIs globaux** demandés :
- Nombre de sessions (total + 7j + 30j)
- Nombre de messages (user vs assistant)
- Utilisateurs uniques (via `user_id` sessions/messages)
- OCR effectués (statuts : ok / low_confidence / failed)
- Répartition sessions par **série BAC** (bar chart Recharts)
- Top 10 filières les plus citées (via `apresbac_chat_sources.record_id` joint sur `apresbac_program_records.program_name`)
- Taux de messages assistant **sans source citée** (indicateur hallucinations)
- Anomalies de référence : 1368 total, breakdown par sévérité, non résolues
- Petit tableau "Dernières sessions" (utilisateur, série, #messages, dernier message) avec lien vers détail read-only (fil complet + sources + tool calls) — utile même en mode KPI.
- Carte "Documents de référence" (`apresbac_reference_documents` publiés / non publiés).

Card ajoutée dans `AdminDashboardPage.tsx` → `/admin/apresbac` (icône GraduationCap).

### 4. RLS & sécurité
Les policies existent déjà (11 tables). Ajouter au besoin la policy admin (via `has_role(auth.uid(),'admin')`) en SELECT pour permettre au back-office de lire toutes les sessions/messages/tool_calls/sources/ocr. Aucune modification schéma.

### 5. Navigation
- Ajouter entrée "Après BAC IA" dans le menu app étudiant (visible aux utilisateurs authentifiés).
- Ajouter card "Après BAC IA — Suivi chats" dans dashboard admin.

## Détails techniques
- Frontend : React/TS existant. Composants shadcn. Recharts pour KPIs.
- Streaming chat : `useChat` AI SDK sur endpoint edge function (comme WAOUH).
- Sources citées rendues sous chaque bulle assistant (badge cliquable → dialog avec extrait + page).
- Gemini 2.5 Flash pour chat + Vision pour OCR (via gateway Lovable AI).
- Types Supabase seront régénérés par la CI après migration éventuelle.

## Hors périmètre
- Import/ETL nouveaux PDFs de référence (les 615 programmes suffisent).
- Résolution manuelle des 1368 anomalies (module séparé, on affiche juste le KPI).
- Export PDF/CSV côté admin (choisi KPI seul).
- Modération/masquage messages (non retenu).

## Validation
1. `/app/apres-bac` : créer session série D, poser "Quelles filières pour maths+physique ?" → réponse cite ≥1 programme avec page/extrait.
2. OCR : uploader relevé fictif → matières détectées, confirmer → visibles dans profil.
3. `/admin/apresbac` : KPIs peuplés (sessions, messages, séries, top filières, taux sans source, anomalies).
4. Vérifier RLS admin lecture cross-user OK, étudiant standard ne voit que ses propres sessions.
