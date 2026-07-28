
# Document d'Architecture WAOUH / bot.bj — Livrable

## Objectif
Produire **un dossier d'architecture complet** de la plateforme (fonctionnel, technique, schéma BDD, cadre d'interopérabilité) livré en **DOCX + PDF téléchargeables**, et accessible depuis une page dédiée `/docs/architecture`.

## Livrables

### 1. Document principal (DOCX + PDF)
Fichier : `Architecture_WAOUH_v1.docx` + `.pdf` dans `/mnt/documents/`.

Structure (≈ 40-50 pages) :

1. **Résumé exécutif** — vision, positionnement Afrique (FCFA, Mobile Money, français + langues locales), stack.
2. **Architecture fonctionnelle**
   - Cartographie des 30+ modules groupés par domaine :
     - Chat & Marketplace (WAOUH Chat, Match, Radar, Diffusion)
     - Agents IA (Commerce, Docs, Site, BI, Stock, Présence QR)
     - WhatsApp IA (WAHA sessions, QR + pairing code)
     - Après BAC IA (chat orientation + OCR relevé)
     - FA IA (consultation + quotas)
     - IA Clinique, IA Visual Creator, Kpakpato Vocal
     - CRM, Prospects, Campagnes qualification
     - Administration (bots-control, apresbac, fa, deals, users, roles)
   - Parcours utilisateurs clés (acheteur, vendeur, livreur, partenaire, admin, étudiant).
3. **Architecture technique**
   - Diagramme d'ensemble (React/Vite front + Flutter mobile → Supabase → Edge Functions → Providers externes).
   - Stack : React 18 + TS, Tailwind, shadcn, Capacitor mobile, Supabase (Postgres + Auth + Storage + Realtime + Edge Functions Deno), Lovable AI Gateway (Gemini 2.5 Flash-Lite), ElevenLabs, Hugging Face NLLB, WAHA, Qosic, Firecrawl, Nominatim.
   - Sécurité : RLS, `has_role`, permissions granulaires `resource.action.scope`, rate-limiting, secrets serveur.
   - Déploiement : Docker Compose sur VPS, GitHub Actions.
   - Performance : bundle splitting, snapshots offline, Service Worker, WebP client-side, cron purge-logs.
4. **Schéma de base de données**
   - Inventaire des ≈ 200 tables regroupées par domaine (waouh_*, apresbac_*, fa_*, wa_*, user_*, etc.).
   - Diagramme ER (Mermaid) des sous-domaines critiques : Deals/Négociation, Après BAC, FA IA, Agents IA, Partners.
   - Fonctions clés (`has_role`, `fa_consume_quota`, `apresbac_*`, `admin_list_waouh_deals`, RAG helpers).
   - Politique RLS et grants.
5. **Cadre d'interopérabilité** (section demandée explicitement)
   - **Principes** : API-first, contrats OpenAPI, événements, idempotence, versioning.
   - **Couches d'interop** :
     - **API REST/RPC** via Edge Functions (auth JWT anon/authenticated/service_role).
     - **Realtime** (Postgres changes) pour chat, notifications, présence.
     - **Webhooks entrants** (WAHA, Qosic, Firecrawl) et **sortants** (partenaires).
     - **Connecteurs data** (Google Sheets, Excel/CSV, sources BI).
     - **Identifiants unifiés** : `device_id`, `user_id`, `phone_e164`, `lid_phone_map`.
   - **Standards proposés** : OpenAPI 3.1, JSON:API, ISO 8601, E.164, ISO 4217 (XOF), OAuth2/JWT, HMAC signatures webhooks.
   - **Gouvernance** : registre d'API, SLA, quotas, observabilité (logs edge, admin_logs), RGPD/consentement.
   - **Matrice d'intégration** (partenaire ↔ canal ↔ protocole ↔ auth) sous forme de tableau.
   - **Roadmap interop** : v1 API publique bots + deals, v2 marketplace SDK, v3 event bus.
6. **Annexes** : glossaire, liste des edge functions, secrets requis, liens dashboard Supabase.

### 2. Diagrammes
- ER Mermaid (par domaine) → intégrés au DOCX en images (rendus via mermaid-cli).
- Diagramme architecture système (Mermaid `graph`).
- Diagramme séquence : parcours "acheter" (chat → négociation → deal → paiement → livraison).

### 3. Page front `/docs/architecture`
Page simple listant les liens de téléchargement (DOCX, PDF) et affichant le sommaire + les diagrammes Mermaid en ligne. Ajout d'une carte sur `AdminDashboardPage`.

## Méthode d'implémentation

1. Interroger Supabase pour lister toutes les tables/fonctions réelles (déjà partiellement en contexte) et snapshoter le schéma.
2. Lister les edge functions déployées (`supabase/functions/*`) pour l'annexe.
3. Générer les diagrammes Mermaid → PNG via `mmdc`.
4. Générer le DOCX via `docx` (script Node) selon le skill `docx` (US Letter, Arial, styles headings, tables avec DXA, images).
5. Convertir en PDF via LibreOffice (`run_libreoffice.py`).
6. QA visuel page par page (pdftoppm → inspection).
7. Écrire les fichiers dans `/mnt/documents/` et exposer via `<presentation-artifact>`.
8. Créer `src/pages/docs/ArchitecturePage.tsx` + route `/docs/architecture` + card admin.

## Hors périmètre
- Pas de modification du code métier existant.
- Pas de génération d'OpenAPI exécutable (décrit conceptuellement seulement — implémentation ultérieure).
- Pas de refonte du dossier `documentationIndex` (on ajoute juste une entrée).

## Validation
- DOCX ouvre sans erreur, PDF lisible sur toutes les pages (QA image par image).
- Route `/docs/architecture` accessible et propose téléchargement.
- Diagrammes ER cohérents avec le schéma Supabase réel.
