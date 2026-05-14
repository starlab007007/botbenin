# Sprint 2 — WAOUH : Web Chat + WAHA WhatsApp

Objectif : offrir à l'utilisateur **deux portes d'entrée/sortie** vers le moteur WAOUH déjà construit au Sprint 1 — un **chatbot web embarqué** (sur bot.bj) et **WhatsApp via WAHA** (HTTP API self-hosted) — tout en gardant un seul cerveau IA et une seule base de données.

## 1. Architecture cible

```text
┌──────────────┐         ┌──────────────────┐
│ 📱 WhatsApp  │         │ 🌐 Web Chatbot   │
│  (mobile)    │         │  (widget bot.bj) │
└──────┬───────┘         └────────┬─────────┘
       │ msg                      │ msg + geoloc navigateur
       ▼                          ▼
┌──────────────┐         ┌──────────────────┐
│ 🟢 WAHA API  │ webhook │ Edge Function    │
│ (self-host)  ├────────►│ waouh-channel-in │◄── POST direct du widget
└──────▲───────┘         └────────┬─────────┘
       │ send-text                │ normalise → {channel, phone|sessionId, text, lat, lng}
       │                          ▼
       │                ┌──────────────────────┐
       │                │ waouh-webhook (core) │  intent + IA + DB
       │                │  (Sprint 1, étendu)  │
       │                └────────┬─────────────┘
       │                         │ reply text
       │   ┌─────────────────────┴──────────────────────┐
       │   ▼                                            ▼
       │ ┌────────────────────┐              ┌────────────────────┐
       └─┤ waouh-channel-out  │              │ Realtime broadcast │
         │ (route WAHA / web) │              │ (waouh_messages)   │
         └────────────────────┘              └─────────┬──────────┘
                                                       ▼
                                              Widget web (live)
```

Un **canal** est ajouté à chaque conversation/utilisateur (`whatsapp` | `web`) pour router la réponse vers la bonne porte de sortie.

## 2. Livrables

### A. Base de données (1 migration)
- `waouh_users`: ajouter `channel text default 'whatsapp'`, `web_session_id text unique nullable`.
- `waouh_conversations`: ajouter `channel text not null default 'whatsapp'`.
- Nouvelle table `waouh_messages` (historique unifié pour le widget web et l'admin) :
  - `conversation_id`, `direction` (`in`|`out`), `channel`, `text`, `meta jsonb`.
  - RLS: lecture publique par `web_session_id` (anon) pour le widget ; admin full read.
  - Ajoutée à `supabase_realtime`.

### B. Edge Functions
1. **`waouh-channel-in`** (nouveau) — point d'entrée unique :
   - `POST {channel, text, sessionId?, phone?, lat?, lng?, city?}` depuis le widget web (anon key).
   - `POST` depuis WAHA (webhook "message") → normalise payload WAHA `{from, body}` → format unifié.
   - GET de vérification ne sert qu'à WAHA (déjà géré, on garde).
   - Insère le message `in` dans `waouh_messages`, appelle `waouh-webhook` (logique IA Sprint 1), insère le `out`, puis appelle `waouh-channel-out`.
2. **`waouh-channel-out`** (nouveau) :
   - Si `channel='whatsapp'` → `POST {WAHA_BASE_URL}/api/sendText` avec `X-Api-Key`.
   - Si `channel='web'` → no-op (le widget reçoit via Supabase Realtime sur `waouh_messages`).
3. **`waouh-webhook`** (existant) : refacto léger pour accepter `channel` et **renvoyer** la réponse plutôt que de l'envoyer (déjà presque le cas) ; garder la compatibilité demo.
4. `config.toml` : `verify_jwt = false` pour `waouh-channel-in` (appelé par WAHA externe et widget anon).

### C. Frontend (widget Web Chat)
- Nouveau composant `src/components/waouh/WaouhWebChat.tsx` :
  - Bulle flottante en bas-droite (toggle), responsive mobile (`max-h-[100dvh]`).
  - Génère un `web_session_id` (uuid stocké en `localStorage`).
  - Demande la géoloc navigateur à la 1re ouverture (fallback Cotonou 6.36, 2.42).
  - Envoie via `supabase.functions.invoke('waouh-channel-in', { body: { channel: 'web', sessionId, text, lat, lng } })`.
  - S'abonne à `waouh_messages` (filter `web_session_id`) en Realtime pour afficher les réponses.
  - Markdown via `react-markdown` (déjà dans le projet).
- Intégration sur `src/pages/waouh/WaouhPage.tsx` : nouvel onglet **"Web Chat"** + montage du widget pour test.
- Intégration globale optionnelle (toggle admin) : monter `<WaouhWebChat />` dans `App.tsx` derrière une feature flag dans `waouh_settings.web_widget_enabled`.

### D. WAHA (porte WhatsApp)
- Pas de Docker dans le repo (le user a déjà WAHA déployé sur VPS, cf. mémoire). On configure :
  - Secrets : `WAHA_BASE_URL`, `WAHA_API_KEY`, `WAHA_SESSION` (par défaut `default`).
  - Onglet **"Connexion WhatsApp"** dans `WaouhPage` : bouton "Démarrer la session" + affichage QR (`GET /api/{session}/auth/qr`), statut session (`GET /api/sessions/{session}`), bouton "Configurer le webhook" qui POST `{events: ["message"], url: "<edge-fn url>/waouh-channel-in"}` sur WAHA.
  - Réutilise le pattern existant `useWAHADashboard` / `useWAHADiagnostic`.

### E. Tests & QA
- Onglet Démo (`WaouhDemoPage`) : ajouter switch **"Canal : Web | WhatsApp"** pour simuler les 2 flux.
- Vérifier 3 scénarios end-to-end : Vendre, Acheter, Payer (Qosic déjà branché Sprint 1).
- Logs edge functions visibles dans l'admin.

## 3. Hors-scope (reporté Sprint 3)
- Workers/queues Bull+Redis (le matching est fait inline par `waouh-notify-buyers`, suffisant à ce stade).
- Object Store (pas de gestion image dans Sprint 2 ; texte seul).
- Multi-langue Fon/Yoruba via Hugging Face NLLB (déjà dispo dans le projet, à brancher au Sprint 3).

## 4. Secrets requis
- `WAHA_BASE_URL`, `WAHA_API_KEY`, `WAHA_SESSION` (à demander avant déploiement WAHA).
- Tous les autres (LOVABLE_API_KEY, Qosic) déjà présents.

## 5. Critères de réussite
- Un utilisateur web peut publier/chercher/payer une annonce sans quitter le widget.
- Un utilisateur WhatsApp peut faire la même chose via WAHA.
- Les deux flux écrivent dans la même base, l'admin voit toutes les conversations dans `WaouhPage`.
- Realtime : le widget web reçoit les réponses sans refresh.
