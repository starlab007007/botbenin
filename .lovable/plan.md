
# 🤖 WAOUH Agent IA — L'Agent WhatsApp du Siècle

Module ajouté **en bas de `/app/whatsapp`**, sous le gestionnaire de sessions existant (intact). Chaque utilisateur crée son agent en **3 minutes**, le connecte à sa session WAHA, et l'agent répond automatiquement sur WhatsApp — peu importe le secteur. **100% français.**

## 1. Vision produit

**"Décris ton business — ton agent s'occupe du reste."**

Un employé virtuel WhatsApp qui :
- Répond aux questions 24/7
- Présente les produits/services et prend des commandes (lien paiement)
- Prend des rendez-vous
- Qualifie les prospects et passe la main à l'humain quand nécessaire
- S'adapte à tout secteur (boutique, resto, clinique, artisan, coach, immobilier…)

**Différenciateur** : on construit l'agent à partir de ce que l'utilisateur donne (voix, PDF, site web, chat guidé, mini-catalogue créé sur place) — sans dépendance au catalogue WAOUH.

## 2. Emplacement UI

Sur `WhatsAppConnectPage.tsx` (utilisateur connecté), sous `SmartWhatsAppInterface` :

```text
┌─ Gestionnaire de Session WhatsApp (existant, intact) ─┐
└───────────────────────────────────────────────────────┘

┌─ 🤖 Vos Agents IA WhatsApp (NOUVEAU) ─────────────────┐
│  [Card] Mon Agent Boutique    ● Actif   [Éditer]     │
│  [+ Créer un nouvel agent IA]                        │
└───────────────────────────────────────────────────────┘
```

## 3. Wizard de création — 5 étapes (2-3 min)

### Étape 1 — Choisis ton métier
Grille de 8 cartes visuelles (templates par secteur) :
🛍️ Boutique · 🍽️ Restaurant · 🏥 Santé · 🔧 Artisan · 🎓 Coach/Formation · 🏠 Immobilier · 💇 Beauté · ⚡ Autre (générique)

Chaque template pré-charge un **system prompt de base**, un ton par défaut, et les capacités actives.

### Étape 2 — Nourris ton agent (multi-source, tout optionnel)
UI en onglets, l'utilisateur combine ce qu'il veut :

| Onglet | Action | Traitement backend |
|---|---|---|
| 🎙️ **Voix** | Bouton rouge → "Parle 60s de ton business" | STT `openai/gpt-4o-mini-transcribe` → Gemini extrait infos en JSON |
| 📄 **Documents** | Drop PDF/image/Word | `document--parse_document` → texte chunké |
| 🌐 **Site web** | Colle URL | Firecrawl scrape → nettoyage Gemini |
| 💬 **Chat guidé** | L'IA pose 5 questions : *Que vends-tu ? Horaires ? Zone ? Fourchette de prix ? Comment tu réponds normalement ?* | Réponses stockées |
| 📦 **Mini-catalogue** | Formulaire simple *sur place* (voir §3.1) | Stocké dans `waouh_ai_agent_products` |

**Indicateur de "richesse de la connaissance"** (barre 0-100%) motive l'utilisateur à ajouter au moins 2 sources.

### 3.1 Mini-catalogue intégré (nouveau, remplace la dépendance WAOUH)
Interface légère dans l'onglet "Mini-catalogue" :
- Bouton **[+ Ajouter un produit/service]** → ligne éditable inline avec :
  - Nom (obligatoire)
  - Prix FCFA (optionnel, sinon "sur demande")
  - Description courte (1 ligne)
  - Photo (upload optionnel, bucket `agent-products` public)
- **3 méthodes rapides d'ajout** :
  1. **Manuel** : formulaire ligne par ligne
  2. **🎙️ Dictée vocale** : "Dis-moi tes produits" → STT + Gemini parse en lignes structurées (nom, prix, description) → l'utilisateur valide/édite
  3. **📸 Photo catalogue** : upload d'une photo/PDF de menu ou liste → Gemini Vision extrait les items en tableau éditable
- Tableau récapitulatif : édition/suppression rapide
- Import CSV en option (bouton discret)

Ces produits sont utilisés par l'agent lors de discussions WhatsApp (recherche, présentation, devis, lien paiement Qosic si activé).

### Étape 3 — Personnalité (template + IA affine)
- Nom de l'agent (pré-rempli : "Assistant [Nom Business]")
- Ton (3 boutons : Amical · Pro · Chaleureux local)
- **Langue : Français uniquement** (pas de sélecteur multi-langues dans cette version)
- Emojis oui/non
- **Boost IA** : bouton "🪄 Laisse WAOUH proposer" → Gemini analyse les données collectées et propose 3 variantes de personnalité prêtes à choisir.

### Étape 4 — Capacités
Toggles simples :
- ✅ Répondre aux questions (toujours ON)
- 💰 Vendre & prendre commandes → génère lien paiement Qosic
- 📅 Prendre rendez-vous → calendrier interne
- 🎯 Qualifier prospects → seuil de score pour handoff
- 🙋 Handoff humain → notif WhatsApp au propriétaire sur mots-clés "humain/patron/urgent" ou 3 "je ne sais pas"

### Étape 5 — Connexion & test
- Sélecteur : session WAHA active à associer
- **Sandbox de test** : chat window intégré pour tester l'agent avant activation
- Bouton **"🚀 Activer sur WhatsApp"** → l'agent répond aux messages entrants

## 4. Architecture technique

### 4.1 Base de données (nouvelles tables)

**`waouh_ai_agents`**
```text
id, user_id, waha_session_id, name, sector, template_id,
persona {tone, emojis, name},   -- langue FR fixée côté prompt
capabilities {qa, sell, appointments, qualify, handoff},
knowledge_sources [{type: 'voice|doc|url|chat|product', ref, processed_at}],
system_prompt (généré),
status: 'draft|training|active|paused',
stats {messages_handled, handoffs, conversions}
```

**`waouh_ai_agent_products`** (mini-catalogue intégré)
```text
id, agent_id, name, price_fcfa (nullable), description, photo_url, position, active
```

**`waouh_ai_agent_chunks`** (RAG)
```text
id, agent_id, source_type, content (text), embedding (vector 768), metadata
```

**`waouh_ai_agent_conversations`**
```text
id, agent_id, wa_contact_phone, messages jsonb[], last_activity, needs_handoff
```

RLS : `user_id = auth.uid()` partout + GRANTs standard + `service_role` pour edge functions.

Storage : bucket public `agent-products` pour les photos de produits.

### 4.2 Edge Functions (nouvelles)

| Function | Rôle |
|---|---|
| `waouh-agent-create` | Persist agent, orchestre ingestion sources |
| `waouh-agent-ingest` | Voice→STT, doc→parse, url→scrape ; chunk + embed via `google/gemini-embedding-001` |
| `waouh-agent-parse-catalog` | Reçoit audio/image/PDF → Gemini extrait items produits en JSON pour l'étape 3.1 |
| `waouh-agent-chat` | Message entrant → RAG top 5 chunks + produits pertinents → `google/gemini-3-flash-preview` → réponse FR ; détecte intent vente/RDV/handoff |
| `waouh-agent-webhook` | Hook WAHA `message.any` → route vers `waouh-agent-chat` → répond via WAHA `sendText` |
| `waouh-agent-persona-suggest` | Génère 3 propositions de personnalité |

### 4.3 Flux runtime WhatsApp

```text
Client WA → WAHA webhook → /waouh-agent-webhook
   → Résout agent par session_id
   → waouh-agent-chat :
       1. embed message → pgvector search knowledge + products
       2. Gemini 3 Flash : system_prompt FR + chunks + historique
       3. Intent : vente=lien paiement | RDV=créneaux | handoff=notif owner
   → WAHA sendText → Client WA
   → Log conversation + stats
```

### 4.4 Frontend — nouveaux fichiers

```text
src/components/whatsapp/agents/
  ├── AgentsSection.tsx
  ├── AgentCard.tsx
  ├── CreateAgentWizard.tsx
  ├── steps/
  │   ├── Step1SectorTemplate.tsx
  │   ├── Step2KnowledgeSources.tsx
  │   ├── Step3Persona.tsx
  │   ├── Step4Capabilities.tsx
  │   └── Step5ConnectTest.tsx
  ├── catalog/
  │   ├── MiniCatalogTab.tsx        (formulaire + tableau)
  │   ├── VoiceCatalogCapture.tsx   (dictée vocale)
  │   └── PhotoCatalogImport.tsx    (photo/PDF → Gemini Vision)
  ├── KnowledgeRichnessBar.tsx
  └── AgentSandboxChat.tsx

src/hooks/
  ├── useAIAgents.ts
  ├── useAgentIngestion.ts
  └── useAgentCatalog.ts

src/config/agent-templates.ts     (8 templates secteur, français)
```

## 5. Stratégie de fusion des données

Gemini fusionne toutes les sources dans un **system prompt FR structuré** :
```text
Tu es [Nom], assistant WhatsApp de [Business]. Réponds toujours en français.
CONTEXTE MÉTIER : {résumé auto-généré}
CATALOGUE : {liste produits mini-catalogue, temps réel}
HORAIRES/ZONE : {chat guidé}
TON : {persona}
CAPACITÉS : {toggles activés → instructions spécifiques}
RÈGLES : mot-clé handoff → notifier propriétaire ; vente confirmée → envoyer lien paiement ; produit inconnu → proposer produits similaires du catalogue.
```

RAG (pgvector) enrichit chaque réponse avec les 5 chunks/produits les plus pertinents.

## 6. Sécurité & robustesse

- RLS stricte `user_id` sur toutes les nouvelles tables + GRANTs
- Rate limit sur `waouh-agent-chat` : 30 msg/min par contact WA
- Anti-boucle : ignore les messages émis par l'agent
- Handoff auto : 3 "je ne sais pas" · plainte détectée · montant > 100 000 FCFA
- Secrets : réutilise `LOVABLE_API_KEY`, `WAHA_*` existants — rien à demander à l'utilisateur

## 7. Livrables (MVP complet 1 shot)

1. Migration DB (4 tables + pgvector + RLS + GRANTs + trigger updated_at) + bucket storage
2. 6 edge functions déployées
3. Section "Vos Agents IA" + Wizard 5 étapes + mini-catalogue (3 méthodes) + Sandbox
4. Webhook WAHA branché → réponses auto WhatsApp
5. 8 templates de secteur pré-remplis (français)
6. Test E2E documenté (secteur boutique) avec numéro test

## 8. Notes UX

- Design cohérent (vert WhatsApp/émeraude)
- Mobile-first : wizard responsive `max-h-[100dvh]`
- Micro-copie chaleureuse en français uniquement
- Aucune modification du gestionnaire de sessions existant
