# Agent IA v2 — Innovation, contrôle & RAG étendu

## 1. Corrections de bugs

**Enregistrement audio (échoue actuellement)**
- Cause probable : `MediaRecorder` produit `audio/webm` (ou `audio/mp4` Safari) → l'endpoint STT reçoit un mauvais `Content-Type`, ou `getUserMedia` n'a pas les permissions HTTPS/iframe.
- Correctifs dans `CreateAgentWizard.tsx` :
  - Détecter le mime réel du `MediaRecorder` (`recorder.mimeType`) et le passer à `waouh-agent-parse-catalog` comme `audio_format` (`webm`, `mp4`, `ogg`).
  - Ajouter `allow="microphone"` fallback + gestion d'erreur explicite (permission refusée, HTTPS requis, navigateur non supporté).
  - Indicateur visuel d'enregistrement (timer + niveau audio) et bouton stop clair.
- Correctif backend `waouh-agent-parse-catalog/index.ts` : accepter `webm/mp4/ogg/m4a`, mapper correctement l'extension du blob, logger le status STT.

## 2. Nouveau flow : Aperçu → Test → Contrôle → Déploiement

Ajout d'une **6ᵉ étape "Aperçu & Test"** dans `CreateAgentWizard` avant validation finale :
- Résumé lisible de l'agent (secteur, persona, capacités, nb produits, nb docs, session WhatsApp).
- **Sandbox intégré au wizard** : chat de test en direct (réutilise `waouh-agent-chat` en mode `dry_run`, sans persister ni compter les stats).
- Toggle **"Prendre la main"** : bascule le sandbox en mode manuel (utilisateur tape la réponse à la place de l'IA) pour comparer.
- Boutons finaux : **Retour éditer** / **Enregistrer brouillon** / **Déployer sur WhatsApp**.

Après déploiement, dans `AgentsSection.tsx` :
- Nouveau panneau **"Conversations en direct"** par agent (temps réel via Supabase Realtime sur `waouh_ai_agent_conversations`).
- Chaque conversation : timeline messages, badge `needs_handoff`, boutons :
  - **⏸️ Mettre en pause l'agent** (toggle `active=false` sur ce contact uniquement → nouvelle colonne `paused_contacts jsonb[]`).
  - **✍️ Répondre manuellement** : envoie via `waha-send-message` avec `role=human_operator` (loggé dans la conversation).
  - **▶️ Reprendre l'IA**.
- Bouton global **"Arrêter l'agent"** (désactive la session WhatsApp côté webhook).

## 3. Intégration Produits Partenaire (capture 1)

Éliminer le mini-catalogue dupliqué au profit du module Partenaire existant :

- Étape "Catalogue" du wizard remplacée par :
  - **Sélecteur multi-produits** depuis `waouh_partner_products` (filtré par `user_id` connecté, groupé par entreprise).
  - Bouton **"Créer un produit dans Mes Produits"** → ouvre `/app/partner/products` dans un nouvel onglet si l'utilisateur n'a pas de produits, ou lien inline "Vous n'avez pas encore de produits ? Créez-en ici".
  - Toggle "Utiliser tout mon catalogue" (auto-sync : l'agent reflète toujours les produits actifs).
- Nouvelle table de liaison `waouh_ai_agent_partner_products (agent_id, product_id)` avec RLS.
- `runAgentTurn` : au lieu de lire `waouh_ai_agent_products`, joindre `waouh_partner_products` via la liaison → utilise nom, prix, description, stock, disponibilité, photos réels.
- Migration douce : conserver `waouh_ai_agent_products` pour rétrocompat, marquer `deprecated`.

## 4. Nouveaux types d'agents RAG (documents & site)

Ajouter au **Step 1 (Secteur)** un choix de **type d'agent** :
1. **Agent Commerce** (actuel — produits partenaire + persona).
2. **Agent Documents (RAG PDF/Word)** — répond uniquement d'après les fichiers uploadés.
3. **Agent Site Web** — s'entraîne uniquement sur le contenu scrapé d'un domaine.

Implémentation :
- Nouvelle colonne `waouh_ai_agents.agent_type` (`commerce | docs | website`).
- **Agent Documents** :
  - Bucket Supabase `agent-documents` (privé, RLS par `user_id`).
  - Upload PDF/DOCX/TXT dans le wizard (drag & drop, max 20 Mo × 10 fichiers).
  - Edge function `waouh-agent-ingest-docs` : parse via `unpdf` (PDF) et `mammoth` (DOCX) côté Deno → chunking 500 tokens + embeddings → `waouh_ai_agent_chunks`.
  - `buildSystemPrompt` en mode `docs` : consigne stricte "Réponds UNIQUEMENT depuis les documents fournis. Sinon dis 'Je ne trouve pas cette information dans mes documents.'"
- **Agent Site Web** :
  - Champ URL + toggle "Crawler tout le site" (sinon page unique).
  - `waouh-agent-ingest` étendu avec Firecrawl `/crawl` (limite 50 pages, timeout 2 min).
  - Affichage du nb de pages ingérées et bouton **"Ré-indexer"**.
  - Mode prompt : "Base-toi uniquement sur le contenu de {domain}."

## 5. Analytics & Google Sheets (capture 2)

Nouveau **Step 4bis "Données & Statistiques"** (optionnel) pour agents commerce :
- Section **"Connecter Google Sheets"** : réutilise `useGoogleSheets` existant. L'utilisateur colle une URL de Sheet (ventes, stock, RDV).
- L'agent peut alors répondre à :
  - *"Combien de ventes cette semaine ?"* → requête lue et agrégée.
  - *"Quel produit se vend le mieux ?"* → tri + réponse en langage naturel.
  - *"Alerte stock bas"* → surveillance périodique (cron edge function `waouh-agent-sheets-monitor`).
- Nouveau **tool AI** `query_sheet` exposé au modèle Gemini (function calling) : le LLM formule une requête → backend exécute et renvoie JSON compact.
- Dans `AgentsSection`, onglet **📊 Statistiques** par agent :
  - Graphique messages traités / handoffs / temps de réponse moyen (Recharts).
  - Table Top questions posées.
  - Graphique ventes/stock si Sheet connecté.
- Message-type "requête simple" côté chat : *"@stats ventes du jour"* → renvoi automatique d'une petite carte graphique.

## 6. Détails techniques

**Migrations SQL** (une seule migration) :
```sql
ALTER TABLE waouh_ai_agents
  ADD COLUMN agent_type text NOT NULL DEFAULT 'commerce'
    CHECK (agent_type IN ('commerce','docs','website')),
  ADD COLUMN paused_contacts jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN google_sheet_url text,
  ADD COLUMN status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','testing','deployed','paused'));

CREATE TABLE waouh_ai_agent_partner_products (
  agent_id uuid REFERENCES waouh_ai_agents ON DELETE CASCADE,
  product_id uuid REFERENCES waouh_partner_products ON DELETE CASCADE,
  PRIMARY KEY (agent_id, product_id)
);
-- + GRANTs + RLS via has_role & auth.uid()

ALTER TABLE waouh_ai_agent_conversations
  ADD COLUMN human_takeover boolean DEFAULT false,
  ADD COLUMN operator_messages jsonb DEFAULT '[]';
```

**Storage bucket** : `agent-documents` (privé) + policies par user.

**Edge functions à créer/modifier** :
- Nouveau : `waouh-agent-ingest-docs`, `waouh-agent-sheets-monitor`, `waouh-agent-manual-reply`, `waouh-agent-crawl-site`.
- Modifiés : `waouh-agent-parse-catalog` (fix mime audio), `waouh-agent-chat` (dry_run + type-aware prompt + tool calling sheet), `waouh-agent-webhook` (respecter pause + human_takeover), `_shared/agent-ai.ts` (nouveau `buildSystemPrompt` par `agent_type`, join partner_products).

**Frontend** :
- `CreateAgentWizard.tsx` : refactor en 6 steps + branchement conditionnel par `agent_type`.
- `AgentsSection.tsx` : ajout onglets Conversations / Stats / Paramètres.
- Nouveau `AgentLiveConversations.tsx`, `AgentStatsPanel.tsx`, `AgentDocsUploader.tsx`, `AgentSiteCrawler.tsx`, `PartnerProductsPicker.tsx`.

## 7. Ordre d'exécution

1. Migration SQL + bucket.
2. Fix audio + refactor `_shared/agent-ai.ts` (agent_type, partner products join).
3. Wizard : Step Secteur (choix type) + Step Catalogue (picker partenaire) + Step Documents/Site conditionnel.
4. Step Aperçu & Test + sandbox dry_run.
5. Panneau conversations live + takeover manuel + pause.
6. Google Sheets + panneau stats.
7. Tests end-to-end sur chaque type d'agent.

Souhaitez-vous que je livre tout en un seul lot ou par phases (bugs+contrôle d'abord, puis RAG docs/site, puis analytics) ?
