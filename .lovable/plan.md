# Plan — Cahier de recette v2 complet (modules IA ajoutés)

## Objectif
Étendre le cahier de recette officiel `/recette` (actuellement v1.0, 237 scénarios, 21 modules) pour intégrer tous les nouveaux modules livrés depuis la v1 : Agents IA WAOUH (Commerce/Docs/Website RAG), BI/Analytique IA, Gestion de Stock IA, Présence au Poste QR, Radar IA, Diffusion IA ciblée, WhatsApp IA (pair-code + QR), Contrôle Admin unifié des bots/agents, Prix Réel WAOUH (Firecrawl+Gemini), Deals & livreurs admin.

## Livrables

### 1. Nouveau document `public/recette/Cahier_Recette_bot_bj_v2.docx`
Généré via le skill DOCX (docx-js), reprenant intégralement les 17 sections v1 + extensions ci-dessous. Environ **420 scénarios** au total sur **30 modules**.

**Nouveaux modules ajoutés (M22 → M30) :**
- **M22 — Agent IA Commerce/Docs/Website (RAG)** (18 scénarios) : création via wizard, ingestion produits partenaires, ingestion documents (PDF/DOCX), ingestion site web (crawl), embeddings pgvector, réponses contextuelles WhatsApp, human takeover, isolation par `user_id`.
- **M23 — Agent BI / Analytique IA** (14 scénarios) : connexion Google Sheets / import CSV/XLSX, refresh datasource, création de requêtes NL→SQL, rendu Recharts (bar/line/pie), export, sécurité RLS `waouh_bi_sources` / `waouh_bi_queries`.
- **M24 — Agent Gestion de Stock IA** (14 scénarios) : création wizard, import stock, mouvements entrée/sortie, seuils réappro, alertes WhatsApp, requêtes IA (ex: "articles en rupture"), historique mouvements.
- **M25 — Agent Présence QR** (14 scénarios) : création site avec adresse Nominatim, rayon géofencé 50m, génération/régénération QR, check-in employé, journal, notifications WhatsApp, révocation token, RLS multi-tenant.
- **M26 — Radar IA (WAOUH Radar)** (10 scénarios) : sonar concentrique, scan géolocalisé, Urgency Mode, matching contacts, lifecycle mobile, autosend.
- **M27 — Diffusion IA ciblée** (14 scénarios) : audience `v_diffusion_audience`, ciblage 3 niveaux (secteur/classe/contact), validation admin, envoi WAHA, tracking clic/lecture, quotas, opt-out.
- **M28 — WhatsApp IA sessions (pair-code + QR)** (12 scénarios) : création session, scan QR, code 8 chiffres, statut WORKING/SCAN_QR/STOPPED, heartbeat, reconnexion, logout, sécurité proxy WAHA.
- **M29 — Contrôle Admin unifié bots/agents** (16 scénarios) : `/admin/bots-control` onglets Bots/AI/BI/Stock/Présence/WA, activation/désactivation, suppression, régénération QR, start/stop/restart/logout WAHA, journalisation `admin_logs`, garde AdminRoute.
- **M30 — Prix Réel WAOUH & Deals admin** (14 scénarios) : verdict prix Gemini + Firecrawl, plage marché réelle, assignation livreur `/admin/waouh/deals`, suivi statuts, fermeture paiement, notifications acheteur/vendeur.

**Modules v1 mis à jour (retouches) :**
- **M15 Sécurité** (+8 scénarios) : RLS `waouh_ai_agents`, `waouh_bi_*`, `waouh_stock_*`, `waouh_attendance_*`, isolation `user_id`, secrets WAHA centralisés, rate-limit chat.
- **M17 API & intégrations** (+6 scénarios) : Firecrawl, Gemini 1.5 Flash, Nominatim, WAHA pair-code, Hugging Face NLLB.
- **M19 Chat WAOUH** (+4 scénarios) : filtre strict keywords (Zara/Mixa), `matchesAnyKeyword` post-filter, verdict prix, catalogue unifié.
- **M21 Partenaire & Admin** (+4 scénarios) : contrôle bots, deals, diffusion validation.

### 2. Mise à jour de la page `src/pages/RecettePage.tsx`
- Bannière "v2.0 — 420 scénarios / 30 modules" (au lieu de v1.0 / 237 / 21).
- Cartes récap mises à jour (Agents IA, Radar, Diffusion, Admin).
- Liste `modules[]` étendue avec M22→M30 (compteurs par module).
- Section "Nouveautés v2" listant les modules ajoutés.
- Bouton de téléchargement pointant vers `Cahier_Recette_bot_bj_v2.docx` (le v1 reste dispo comme "Voir version v1.0").
- Sommaire enrichi si de nouvelles sections transverses (matrice droits étendue, environnement Pro Supabase).
- Focus M19 conservé + nouvel encart "Focus Agents IA (M22-M25)".

### 3. Génération du .docx
- Script Node local via docx-js utilisant les conventions du skill (Arial, Letter 12240×15840 DXA, styles Heading1-3, listes via `LevelFormat.BULLET`, tables avec `columnWidths`+`WidthType.DXA`, smart quotes).
- Écriture dans `public/recette/Cahier_Recette_bot_bj_v2.docx`.
- Validation `validate_document.py` + conversion PDF → images QA pour repérer débordements/tableaux cassés avant livraison.

### 4. Aucune modification hors périmètre
- Aucun changement sur les moteurs (chat WAOUH v12 invariants respectés), sur les edge functions, sur la DB.
- Uniquement : ajout `.docx` v2 + refactor présentation `RecettePage.tsx`.

## Détails techniques
- Chaque scénario respecte le gabarit v1 : ID, titre, prérequis, étapes numérotées, résultat attendu, criticité (Bloquant/Majeur/Mineur), profil, statut.
- Matrice des droits étendue avec les rôles impliqués par les nouveaux modules (partenaire, admin, employé QR, acheteur/vendeur mobile).
- Section 6 (Environnement) : ajout Pro Supabase, WAHA VPS, Firecrawl API, Gemini API, Nominatim.
- Section 8 (Stratégie) : ajout tests géofence, tests RAG (pertinence embeddings), tests OCR/import CSV/XLSX, tests notification push mobile.

## Test / validation du livrable
1. Ouvrir `/recette`, vérifier les nouveaux compteurs 420 / 30.
2. Télécharger le `.docx` v2, vérifier : structure 17+ sections, TOC, absence de placeholder, tables propres, styles cohérents.
3. Convertir en PDF, inspecter chaque page en image (QA visuelle skill DOCX) — corriger et regénérer si débordement.
4. Vérifier que le lien v1 reste accessible pour historique.

## Hors périmètre (non fait dans ce plan)
- Exécution réelle des 420 scénarios (c'est le rôle de la phase de recette elle-même).
- Traduction anglaise.
- Génération PDF signé (l'utilisateur peut l'imprimer/exporter depuis Word).
