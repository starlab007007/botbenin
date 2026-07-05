# Plan : 3 nouveaux agents IA intelligents

Ajouter dans le wizard "Créer mon agent IA" trois nouveaux types spécialisés, chacun avec parcours dédié, backend Supabase, et fonctionnement de bout en bout.

## 1. Agent IA BI / Visualisation de données 📊

**Objectif** : analyser un Google Sheet, Excel, CSV ou URL de données et générer graphiques + insights en langage naturel.

**Parcours utilisateur** :
1. Choix source : Google Sheet (URL), upload Excel/CSV, ou URL JSON/API publique
2. Aperçu auto des colonnes détectées + suggestion du type d'analyse
3. Chat IA : "montre-moi les ventes par mois", "quel est le top 5 produits ?"
4. Rendu : tableaux, bar/line/pie charts (Recharts), KPI cards, résumé narratif

**Backend** :
- Nouvelle table `waouh_bi_datasources` (source_type, url, sheet_id, file_path, schema jsonb, user_id, agent_id)
- Table `waouh_bi_queries` (agent_id, question, sql_or_spec jsonb, chart_type, result_cache jsonb)
- Edge function `waouh-bi-ingest` : télécharge/parse la source, extrait schéma, échantillonne 100 lignes
- Edge function `waouh-bi-query` : envoie schéma + question à Gemini 2.5 → renvoie spec `{chart_type, x, y, aggregation, filters, summary}`
- Bucket storage `bi-datasets` pour fichiers Excel/CSV uploadés

**Frontend** :
- Écran `BiAgentWizard.tsx` (source → aperçu → chat)
- Composant `BiChartRenderer.tsx` (Recharts : bar/line/pie/area/kpi/table)
- Composant `BiChatPanel.tsx` (questions naturelles + historique)

## 2. Agent IA Gestion de Stock 📦

**Objectif** : suivi intelligent des stocks avec alertes, prévisions, recommandations de réappro.

**Parcours utilisateur** :
1. Import initial : Google Sheet, Excel, ou saisie manuelle des produits (nom, SKU, stock, seuil, prix)
2. Dashboard : niveau actuel, ruptures, rotation, valeur totale stock
3. Actions rapides : entrée/sortie de stock, ajustement inventaire
4. Chat IA expert : "quels produits vont bientôt manquer ?", "propose une commande fournisseur"
5. Alertes WhatsApp automatiques quand stock < seuil (via `waouh-outbound-queue`)

**Backend** :
- Table `waouh_stock_items` (agent_id, sku, name, quantity, threshold_low, unit_price_fcfa, category, supplier, updated_at)
- Table `waouh_stock_movements` (item_id, type: in/out/adjust, quantity, reason, user_id, created_at)
- Table `waouh_stock_alerts` (item_id, level: low/critical/out, notified_at, whatsapp_msisdn)
- Edge function `waouh-stock-analyze` : calcule rotation, prédit ruptures via Gemini, propose commandes
- Edge function `waouh-stock-alert` : cron toutes les 6h, détecte seuils, pousse dans `waouh_outbound_queue`

**Frontend** :
- Écran `StockAgentDashboard.tsx` (KPI + tableau + graphiques)
- Composant `StockMovementDialog.tsx` (entrée/sortie rapide)
- Composant `StockAiInsights.tsx` (recommandations IA)

## 3. Agent IA Présence par QR géolocalisé 📍

**Objectif** : QR affiché sur site, valide uniquement dans un rayon de 50 m, notification WhatsApp à l'employeur pour arrivée/pause/sortie.

**Parcours création** :
1. Nom du poste/site + adresse (auto-géocodage → lat/lng)
2. Rayon autorisé (défaut 50 m, ajustable 20–200 m)
3. Numéro WhatsApp employeur pour notifications
4. Liste des employés (nom, téléphone) — import manuel ou via Google Sheet
5. Génération QR (URL signée vers `/checkin/:token`)
6. Téléchargement / impression du QR

**Parcours employé (scan)** :
1. Scan → page publique `/checkin/:token`
2. Demande géolocalisation navigateur
3. Vérifie distance ≤ rayon (Haversine côté serveur)
4. Sélection nom dans liste
5. Vérification n° portable (dernier 4 chiffres ou OTP court)
6. Choix action : Arrivée / Pause / Retour de pause / Sortie
7. Confirmation → message WhatsApp envoyé à l'employeur + confirmation employé

**Backend** :
- Table `waouh_attendance_sites` (agent_id, name, address, lat, lng, radius_m, employer_msisdn, qr_token, active)
- Table `waouh_attendance_employees` (site_id, full_name, msisdn, employee_code, active)
- Table `waouh_attendance_events` (site_id, employee_id, action: arrival/break_start/break_end/departure, lat, lng, distance_m, verified_at, notification_sent)
- Edge function `waouh-attendance-checkin` (public, validation géo + insertion + notification)
- Edge function `waouh-attendance-notify` : formate message WhatsApp et envoie via `waouh-outbound-queue`
- RLS : sites/employés = propriétaire uniquement ; events = insert public via edge function service_role

**Frontend** :
- Écran création `AttendanceAgentWizard.tsx`
- Écran gestion `AttendanceDashboard.tsx` (sites, employés, historique événements, export)
- Page publique `CheckinPage.tsx` (route `/checkin/:token`, sans auth)
- Composant `QrCodePrintable.tsx` (QR + logo + instructions imprimables)

## 4. Intégration dans le wizard existant

Modifier `CreateBotWizard.tsx` (mobile) et l'équivalent desktop pour ajouter à l'étape "type d'agent" :
- 📊 Agent BI / Analytics
- 📦 Gestion Stock
- 📍 Présence QR

Chaque choix redirige vers son wizard dédié au lieu du flux générique.

## 5. Tests de bout en bout

Pour chaque agent :
- Test création + persistance Supabase
- Test edge function (ingest / query / checkin) via `supabase--test_edge_functions`
- Test UI mobile + desktop (viewport)
- Screenshot Playwright du parcours complet
- Vérification RLS : un autre user ne voit pas les données

## Détails techniques

- **Charts** : Recharts (déjà dans le projet)
- **Excel parsing** : `xlsx` npm dans edge function
- **Google Sheets** : réutiliser `useGoogleSheets` + connecteur existant
- **QR** : `qrcode.react` côté client, token signé HMAC dans l'URL
- **Géolocalisation** : `navigator.geolocation` + Haversine côté serveur (jamais faire confiance au client)
- **WhatsApp** : réutiliser `waouh_outbound_queue` + WAHA existant
- **IA** : Lovable AI Gateway avec `google/gemini-2.5-flash` (déjà en place)
- **Nouvelles migrations** : 3 migrations (une par module) avec GRANT + RLS + triggers `updated_at`
- **Nouvelles edge functions** : `waouh-bi-ingest`, `waouh-bi-query`, `waouh-stock-analyze`, `waouh-stock-alert`, `waouh-attendance-checkin`, `waouh-attendance-notify`

## Ordre d'implémentation

1. Migrations DB (3 modules)
2. Edge functions
3. Ajout des 3 types dans le wizard racine
4. Wizards + dashboards dédiés
5. Page publique check-in
6. Tests E2E + Playwright screenshots
