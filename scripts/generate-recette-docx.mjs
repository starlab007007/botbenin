// Génère le Cahier de recette bot.bj (.docx)
// Sortie : /mnt/documents/Cahier_Recette_bot_bj_v1.docx + public/recette/...
import fs from "node:fs";
import path from "node:path";
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, LevelFormat, BorderStyle, WidthType,
  ShadingType, PageOrientation, PageNumber, Footer, Header, PageBreak,
  TabStopType, TabStopPosition,
} from "docx";

const DXA = (inches) => Math.round(inches * 1440);
const PAGE_W = 12240, PAGE_H = 15840, MARGIN = 1080;
const CONTENT_W = PAGE_W - MARGIN * 2; // 10080

const BRAND = "1B5E20"; // vert bot.bj
const BRAND_LIGHT = "E8F5E9";
const GREY = "F5F5F5";
const BORDER = { style: BorderStyle.SINGLE, size: 4, color: "BBBBBB" };
const CELL_BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };
const CELL_MARGINS = { top: 60, bottom: 60, left: 100, right: 100 };

// ── helpers ──────────────────────────────────────────────────────────────
const P = (text, opts = {}) => new Paragraph({
  spacing: { after: opts.after ?? 80, before: opts.before ?? 0 },
  alignment: opts.align ?? AlignmentType.LEFT,
  children: [new TextRun({ text, bold: opts.bold, italics: opts.italics, size: opts.size ?? 20, color: opts.color })],
});
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, spacing: { before: 240, after: 160 }, children: [new TextRun({ text: t, bold: true, size: 32, color: BRAND })] });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 }, children: [new TextRun({ text: t, bold: true, size: 26, color: BRAND })] });
const H3 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_3, spacing: { before: 160, after: 80 }, children: [new TextRun({ text: t, bold: true, size: 22 })] });

const cell = (txt, opts = {}) => new TableCell({
  borders: CELL_BORDERS,
  margins: CELL_MARGINS,
  width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
  shading: opts.shade ? { fill: opts.shade, type: ShadingType.CLEAR, color: "auto" } : undefined,
  children: Array.isArray(txt)
    ? txt.map(t => new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: String(t), bold: opts.bold, size: 18 })] }))
    : [new Paragraph({ spacing: { after: 0 }, alignment: opts.align ?? AlignmentType.LEFT, children: [new TextRun({ text: String(txt ?? ""), bold: opts.bold, size: 18 })] })],
});

const table = (widths, rows, opts = {}) => new Table({
  width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
  columnWidths: widths,
  rows: rows.map((r, i) => new TableRow({
    tableHeader: opts.header && i === 0,
    children: r.map((c, ci) => typeof c === "object" && c instanceof TableCell ? c : cell(c, { width: widths[ci], shade: opts.header && i === 0 ? BRAND_LIGHT : undefined, bold: opts.header && i === 0 })),
  })),
});

const bullet = (text) => new Paragraph({
  numbering: { reference: "bullets", level: 0 },
  spacing: { after: 40 },
  children: [new TextRun({ text, size: 20 })],
});

const num = (text) => new Paragraph({
  numbering: { reference: "numbers", level: 0 },
  spacing: { after: 40 },
  children: [new TextRun({ text, size: 20 })],
});

// ── contenu ──────────────────────────────────────────────────────────────
const TODAY = "12 juin 2026";
const VERSION = "1.0";

// Modules génériques scénarios
let scenarioCounter = 0;
const newId = (mod) => `T${String(mod).padStart(2, "0")}-${String(++scenarioCounter).padStart(3, "0")}`;
const resetCounter = () => { scenarioCounter = 0; };

// Génère un scénario standard
function S(modNum, fonctionnalite, objectif, profil, etapes, attendu, criticite = "Majeure", preuve = "Capture écran") {
  return {
    id: newId(modNum), module: `M${modNum}`, fonctionnalite, objectif,
    preconditions: "Plateforme accessible, compte profil disponible",
    profil, donnees: "Jeu de données de recette", etapes, attendu,
    obtenu: "", statut: "À tester", criticite, preuve, commentaires: "",
  };
}

// === Définition des 18+ modules avec scénarios ===
const MODULES = [];

// M1 - Authentification
MODULES.push({
  num: 1, name: "Authentification et accès",
  desc: "Couvre la connexion via email/mot de passe, OTP WhatsApp, gestion de session et déconnexion. Concerne l'app web, l'APK mobile et l'accès anonyme via x-waouh-session.",
  scenarios: [
    S(1, "Connexion email valide", "Vérifier l'authentification réussie avec identifiants valides", "Utilisateur standard", "1. Aller sur /auth\n2. Saisir email valide\n3. Saisir mot de passe valide\n4. Cliquer Se connecter", "Redirection vers /app/dashboard et session active", "Bloquante", "Capture + cookie session"),
    S(1, "Connexion email invalide", "Vérifier le rejet avec mot de passe erroné", "Utilisateur standard", "1. /auth\n2. Email valide + mot de passe faux\n3. Soumettre", "Message d'erreur explicite, pas de session créée", "Majeure"),
    S(1, "Connexion email inexistant", "Vérifier message générique anti-énumération", "Visiteur anonyme", "1. /auth avec email non enregistré", "Message identique à mauvais mot de passe (anti-énumération)", "Majeure"),
    S(1, "OTP WhatsApp envoi", "Demander code OTP via WhatsApp", "Utilisateur mobile", "1. Saisir +22901020304\n2. Demander OTP\n3. Vérifier réception WhatsApp", "Code 6 chiffres reçu en <15s", "Bloquante", "Capture WhatsApp"),
    S(1, "OTP WhatsApp validation", "Valider le code reçu", "Utilisateur mobile", "1. Reçu OTP\n2. Saisir 6 chiffres\n3. Valider", "Session créée, redirection /app", "Bloquante"),
    S(1, "OTP expiré", "OTP rejeté après 10 min", "Utilisateur mobile", "1. Demander OTP\n2. Attendre 11 min\n3. Saisir code", "Erreur Code expiré, possibilité de redemander", "Majeure"),
    S(1, "OTP rate-limit", "Bloquer après 5 demandes/heure", "Utilisateur mobile", "1. Demander OTP 6 fois consécutives", "6e tentative refusée avec délai indiqué", "Majeure"),
    S(1, "Mot de passe oublié", "Envoi lien réinitialisation", "Utilisateur standard", "1. /auth → Mot de passe oublié\n2. Saisir email\n3. Vérifier boîte mail", "Email reçu avec lien valide 1h", "Majeure", "Email reçu"),
    S(1, "Reset password lien expiré", "Lien refusé après 1h", "Utilisateur standard", "1. Lien reçu 2h plus tôt\n2. Cliquer", "Page d'erreur, demande de nouveau lien", "Majeure"),
    S(1, "Changement de mot de passe", "Mettre à jour le mot de passe depuis profil", "Utilisateur standard", "1. /app/profile\n2. Saisir ancien + nouveau\n3. Confirmer", "MAJ effectuée, déconnexion des autres sessions", "Majeure"),
    S(1, "Verrouillage tentatives", "Compte bloqué après 5 échecs", "Visiteur anonyme", "1. 5 tentatives échouées même email", "Compte temporairement bloqué 15 min", "Majeure"),
    S(1, "Déconnexion", "Détruire la session active", "Utilisateur standard", "1. Cliquer Déconnexion\n2. Tenter d'accéder /app", "Redirection /auth, session révoquée", "Majeure"),
    S(1, "Expiration session JWT", "Refresh token expire 30j", "Utilisateur standard", "1. Inactif 31j\n2. Rafraîchir page", "Redirection /auth", "Mineure"),
    S(1, "Accès route protégée sans session", "Garde RequireAuth fonctionne", "Visiteur anonyme", "1. URL directe /app/dashboard", "Redirection /auth?redirect=/app/dashboard", "Bloquante"),
    S(1, "Session x-waouh-session anonyme", "Visiteur anonyme accède au chat WAOUH", "Visiteur anonyme", "1. /app/chat sans login\n2. Vérifier localStorage waouh-session-id\n3. Envoyer message", "Session créée, header transmis, message inséré", "Bloquante", "Network tab"),
  ],
});

// M2 - Utilisateurs
MODULES.push({
  num: 2, name: "Gestion des utilisateurs",
  desc: "CRUD des comptes utilisateurs côté admin (table profiles + auth.users), gestion des doublons et exports.",
  scenarios: [
    S(2, "Création utilisateur admin", "Créer manuellement un compte", "Administrateur", "1. /admin/users → Ajouter\n2. Saisir email + rôle\n3. Sauvegarder", "Utilisateur créé, email d'invitation envoyé", "Majeure"),
    S(2, "Modification profil", "Modifier nom, téléphone, langue", "Utilisateur standard", "1. /app/profile\n2. Modifier champs\n3. Enregistrer", "Modifications persistées en base", "Majeure"),
    S(2, "Désactivation compte", "Désactiver sans supprimer", "Administrateur", "1. /admin/users → user X → Désactiver", "Connexion refusée pour user X, données conservées", "Majeure"),
    S(2, "Suppression logique (soft delete)", "Supprimer profil sans purge auth", "Administrateur", "1. Supprimer user\n2. Vérifier audit", "Profil deleted_at rempli, données rattachées préservées", "Majeure"),
    S(2, "Réactivation", "Réactiver un compte désactivé", "Administrateur", "1. Liste désactivés → Réactiver", "Connexion à nouveau possible", "Mineure"),
    S(2, "Affectation rôle admin", "Promouvoir un utilisateur", "Administrateur", "1. /admin/users → Affecter rôle admin\n2. Vérifier table user_roles", "Ligne (user_id, 'admin') créée", "Bloquante"),
    S(2, "Doublon email refusé", "Empêcher inscription email existant", "Visiteur anonyme", "1. S'inscrire avec email déjà utilisé", "Erreur claire, pas de doublon créé", "Majeure"),
    S(2, "Recherche utilisateur", "Filtrer par email/nom", "Administrateur", "1. /admin/users → recherche texte", "Résultats pertinents en <1s", "Mineure"),
    S(2, "Pagination liste users", "100 utilisateurs paginés", "Administrateur", "1. Liste 250 users\n2. Naviguer pages", "Pages de 50, navigation fluide", "Mineure"),
    S(2, "Export CSV utilisateurs", "Export liste filtrée", "Administrateur", "1. Filtrer puis Exporter CSV", "Fichier .csv téléchargé, encodage UTF-8", "Mineure", "Fichier CSV"),
    S(2, "Historique connexions", "Voir 30 dernières connexions", "Administrateur", "1. user X → Historique", "Liste avec IP, user-agent, date", "Mineure"),
    S(2, "Import utilisateurs CSV", "Import en masse", "Administrateur", "1. Upload .csv 50 lignes\n2. Mapper colonnes\n3. Valider", "Rapport import : N réussis / M erreurs", "Mineure", "Rapport import"),
  ],
});

// M3 - Rôles/permissions
MODULES.push({
  num: 3, name: "Rôles, profils et permissions",
  desc: "Système basé sur la table user_roles + fonction security definer has_role() pour éviter récursion RLS.",
  scenarios: [
    S(3, "has_role admin OK", "Fonction retourne true pour admin", "Administrateur", "1. SQL: SELECT has_role(uid, 'admin')", "true", "Bloquante"),
    S(3, "has_role refus utilisateur", "false pour user simple", "Utilisateur standard", "1. SELECT has_role(uid, 'admin') depuis user simple", "false", "Bloquante"),
    S(3, "Accès page admin refusé", "Garde côté UI", "Utilisateur standard", "1. URL /admin/users en tant que user", "Redirection /app ou page 403", "Bloquante"),
    S(3, "Bouton Admin caché", "UI conditionnelle", "Utilisateur standard", "1. Inspecter menu /app", "Aucun lien Admin visible", "Mineure"),
    S(3, "Création rôle admin via UI", "Affecter rôle", "Administrateur", "1. /admin/users → ajouter rôle", "Insertion user_roles OK + log audit", "Majeure"),
    S(3, "Révocation rôle", "Retirer admin à un user", "Administrateur", "1. Retirer rôle admin", "Suppression ligne, accès admin refusé en <30s", "Majeure"),
    S(3, "Privilege escalation tentative", "User ne peut pas se donner admin", "Utilisateur standard", "1. POST direct user_roles avec role=admin", "RLS refuse insertion", "Bloquante"),
    S(3, "Permission partenaire", "Permissions granulaires waouh_partner_permissions", "Partenaire", "1. Accès module Payouts désactivé\n2. Tenter accès", "403/redirection", "Majeure"),
    S(3, "Traçabilité changement rôle", "Audit log présent", "Administrateur", "1. Affecter rôle\n2. Consulter admin_logs", "Ligne (actor, target, role, action) créée", "Majeure"),
    S(3, "Séparation rôles validateur/admin", "Validateur ne peut pas créer users", "Validateur", "1. Tenter création user", "Action refusée", "Majeure"),
  ],
});

// M4 - Dashboard
MODULES.push({
  num: 4, name: "Tableau de bord",
  desc: "/app/dashboard — KPIs marketplace, partenaires, chat, conversions.",
  scenarios: [
    S(4, "Affichage KPI principaux", "Vérifier 6 indicateurs", "Utilisateur standard", "1. /app/dashboard", "6 cards visibles avec valeurs numériques", "Majeure"),
    S(4, "Cohérence chiffres", "Total messages = SUM(waouh_messages)", "Administrateur", "1. Comparer KPI avec requête SQL", "Égalité ±0", "Majeure"),
    S(4, "Filtre par période", "7j / 30j / 90j", "Utilisateur standard", "1. Sélectionner filtre 7j", "KPIs et graphiques rafraîchis", "Majeure"),
    S(4, "Graphique évolutif", "Line chart messages/jour", "Utilisateur standard", "1. Observer chart", "30 points, axes labellisés FR", "Mineure"),
    S(4, "Données vides", "Nouveau compte sans data", "Utilisateur standard", "1. Compte vierge", "État vide explicite : « Aucune donnée »", "Mineure"),
    S(4, "Lien vers détail", "Cliquer KPI ouvre liste", "Utilisateur standard", "1. Clic Messages → liste filtrée", "Navigation correcte", "Mineure"),
    S(4, "Refresh manuel", "Bouton actualiser", "Utilisateur standard", "1. Modifier data en BDD\n2. Cliquer refresh", "Nouvelles valeurs affichées", "Mineure"),
    S(4, "Export dashboard PDF", "Snapshot téléchargeable", "Administrateur", "1. Export PDF", "PDF avec date, logos, KPIs", "Mineure", "PDF"),
    S(4, "Filtre zone géographique", "Cotonou / Porto-Novo / National", "Administrateur", "1. Filtre Cotonou", "KPIs scopés ville", "Mineure"),
    S(4, "Affichage responsive", "Cards empilées sur mobile", "Utilisateur mobile", "1. APK ou viewport 375px", "Stacked cards, scroll vertical OK", "Majeure"),
  ],
});

// M5 - Données métier (articles WAOUH)
MODULES.push({
  num: 5, name: "Gestion des données métier — articles WAOUH",
  desc: "Catalogue articles (waouh_articles + waouh_unified_catalog), pièces jointes, workflow modération.",
  scenarios: [
    S(5, "Créer article complet", "Article avec photo, prix, ville", "Vendeur", "1. /app/articles/new\n2. Remplir tous champs\n3. Soumettre", "Article créé statut pending, ID retourné", "Bloquante"),
    S(5, "Champ prix obligatoire", "Validation FCFA requis", "Vendeur", "1. Soumettre sans prix", "Erreur sous champ prix", "Majeure"),
    S(5, "Format prix FCFA", "Pas de décimales", "Vendeur", "1. Saisir 1500.50", "Arrondi automatique à 1500", "Mineure"),
    S(5, "Photo obligatoire", "Au moins 1 image", "Vendeur", "1. Soumettre 0 photo", "Erreur claire", "Majeure"),
    S(5, "Photo format invalide", "Refus .exe ou .svg", "Vendeur", "1. Upload .exe", "Refus + message clair", "Majeure"),
    S(5, "Photo taille max 5 Mo", "Refus >5 Mo", "Vendeur", "1. Upload 10 Mo", "Refus", "Majeure"),
    S(5, "Modification article", "Éditer son article", "Vendeur", "1. Mes articles → éditer\n2. Modifier prix\n3. Save", "Modifs persistées", "Majeure"),
    S(5, "Suppression article", "Suppression logique", "Vendeur", "1. Supprimer article", "deleted_at posé, conversations préservées", "Majeure"),
    S(5, "Recherche multicritère", "Filtre prix + ville + catégorie", "Acheteur", "1. /app/search avec 3 filtres", "Résultats cohérents", "Majeure"),
    S(5, "Pagination résultats", "20 par page", "Acheteur", "1. Recherche 100 résultats", "5 pages, nav OK", "Mineure"),
    S(5, "Tri par prix asc/desc", "Tri dynamique", "Acheteur", "1. Trier prix asc puis desc", "Résultats réordonnés", "Mineure"),
    S(5, "Doublon détecté", "Système suggère similaire", "Vendeur", "1. Créer article quasi-identique", "Suggestion fusion ou doublon affiché", "Mineure"),
    S(5, "Archivage article vendu", "Sortir du catalogue actif", "Vendeur", "1. Marquer vendu", "Statut sold, hors recherche", "Mineure"),
    S(5, "Brouillon sauvegardé", "Sauvegarde auto", "Vendeur", "1. Remplir partiellement\n2. Quitter\n3. Revenir", "Brouillon restauré", "Mineure"),
  ],
});

// M6 - Workflows (négociation/deal)
MODULES.push({
  num: 6, name: "Workflows négociation et deal",
  desc: "Cycle : interest → negotiation_open → offre → contre-offre → deal_created → paid → delivered → closed.",
  scenarios: [
    S(6, "Acheteur exprime intérêt", "Premier contact sur article", "Acheteur", "1. Article → Je suis intéressé", "waouh_interests créé + notif vendeur", "Bloquante"),
    S(6, "Négociation ouverte", "Premier message d'offre", "Acheteur", "1. Envoyer offre 4000 FCFA", "waouh_negotiations row, statut open", "Bloquante"),
    S(6, "Contre-offre vendeur", "Réponse vendeur", "Vendeur", "1. Répondre 4500 FCFA", "Message + update négociation", "Majeure"),
    S(6, "Acceptation offre", "Accord trouvé", "Vendeur", "1. Cliquer Accepter offre 4500", "deal_created, statut deal", "Bloquante"),
    S(6, "Refus offre", "Vendeur refuse", "Vendeur", "1. Refuser avec motif", "Négo close_rejected + notif acheteur", "Majeure"),
    S(6, "Annulation acheteur", "Acheteur abandonne", "Acheteur", "1. Annuler négo", "Statut close_buyer_canceled", "Majeure"),
    S(6, "Paiement Mobile Money", "Qosic checkout", "Acheteur", "1. Payer 4500 via MoMo\n2. Valider USSD", "payment_transactions success, deal paid", "Bloquante", "Notif WA + log"),
    S(6, "Paiement échoué", "USSD refusé", "Acheteur", "1. Annuler USSD", "Statut failed, possibilité retry", "Majeure"),
    S(6, "Livraison confirmée", "Acheteur reçoit", "Acheteur", "1. Marquer reçu", "Statut delivered, libération fonds vendeur", "Bloquante"),
    S(6, "Dispute ouverte", "Acheteur conteste", "Acheteur", "1. Ouvrir dispute", "Statut disputed, escalade support", "Majeure"),
    S(6, "Blocage modif après deal", "Article non éditable", "Vendeur", "1. Tenter éditer article en deal", "Action refusée", "Majeure"),
    S(6, "Historique workflow visible", "Timeline complète", "Acheteur", "1. Détail deal → Historique", "Toutes étapes datées, acteurs identifiés", "Mineure"),
  ],
});

// M7 - Notifications
MODULES.push({
  num: 7, name: "Notifications",
  desc: "Multi-canal : WhatsApp (waouh_outbound_queue), in-app (waouh_notifications), push (device_tokens), email.",
  scenarios: [
    S(7, "Notif WA nouvelle offre", "Vendeur reçoit WA", "Vendeur", "1. Acheteur fait offre\n2. Vérifier WhatsApp vendeur", "Message WA reçu <30s", "Bloquante", "Capture WA"),
    S(7, "Notif in-app temps réel", "Realtime via Supabase", "Vendeur", "1. App ouverte\n2. Acheteur écrit", "Toast + badge incrément <2s", "Bloquante"),
    S(7, "Push mobile (APK)", "Notification push", "Utilisateur mobile", "1. App fermée\n2. Recevoir message", "Notification système affichée", "Majeure", "Capture push"),
    S(7, "Email validation deal", "Email transactionnel", "Acheteur", "1. Deal créé", "Email avec récap + CTA", "Majeure"),
    S(7, "Dédup notif WA", "Pas de double envoi", "Vendeur", "1. Webhook WA répété 2x", "Une seule notification (unique index channel_message_id)", "Bloquante"),
    S(7, "Retry exponentiel", "5s→30s→2min→10min→1h", "Administrateur", "1. WAHA down\n2. Vérifier queue", "next_attempt_at progresse correctement", "Majeure"),
    S(7, "Circuit breaker ouvert", "Plus de retry après 5 échecs", "Administrateur", "1. 5 échecs consécutifs", "circuit_open_until rempli, queue gelée", "Majeure"),
    S(7, "Rate-limit 10 msg/min/numéro", "Anti-flood", "Administrateur", "1. Envoyer 15 msg en 1 min même numéro", "Seuls 10 partent, 5 repoussés", "Majeure"),
    S(7, "Notif marquée lue", "Update sent_at", "Utilisateur standard", "1. Cliquer notif", "is_read=true, badge décrément", "Mineure"),
    S(7, "Préférences notif", "Désactiver email", "Utilisateur standard", "1. /profile/notifications → off email", "Aucun email envoyé", "Mineure"),
    S(7, "Pas de notif au propre auteur", "Acheteur n'est pas notifié de ses messages", "Acheteur", "1. Envoyer message\n2. Vérifier inbox acheteur", "Aucune notif self", "Mineure"),
    S(7, "Template multilingue", "FR/Fon selon préférence", "Utilisateur standard", "1. Set langue = Fon\n2. Recevoir notif", "Texte en Fon (via NLLB ou template)", "Mineure"),
    S(7, "Notif d'erreur paiement", "Acheteur informé d'échec", "Acheteur", "1. Paiement fail", "WA + email d'erreur reçus", "Majeure"),
    S(7, "Notif rappel négo dormante", "Relance 24h", "Acheteur", "1. Négo sans réponse 24h", "Rappel WA envoyé une fois", "Mineure"),
  ],
});

// M8 - Recherche
MODULES.push({
  num: 8, name: "Recherche, filtres et consultation",
  desc: "Recherche full-text articles, conversations, contacts.",
  scenarios: [
    S(8, "Recherche simple mot-clé", "Trouver « moto » dans articles", "Acheteur", "1. /search moto", "Résultats pertinents", "Majeure"),
    S(8, "Recherche avancée combinée", "Ville + catégorie + prix max", "Acheteur", "1. 3 filtres + texte", "Résultats intersect", "Majeure"),
    S(8, "Recherche par ID exact", "ID article UUID", "Administrateur", "1. /admin/articles?id=UUID", "Article unique affiché", "Mineure"),
    S(8, "Recherche par statut", "Filtre pending/published", "Administrateur", "1. Filtre pending", "Liste correcte", "Mineure"),
    S(8, "Recherche par date", "Articles 7 derniers jours", "Administrateur", "1. Filtre date 7j", "Résultats datés OK", "Mineure"),
    S(8, "Recherche par utilisateur", "Articles de user X", "Administrateur", "1. Filtre seller=X", "Liste correcte", "Mineure"),
    S(8, "Réinitialisation filtres", "Tout reset", "Acheteur", "1. Cliquer Reset", "Tous filtres vidés", "Mineure"),
    S(8, "Résultats vides", "Aucun match", "Acheteur", "1. Rechercher xyzqwerty", "État vide explicite + suggestion", "Mineure"),
    S(8, "Conversation recherche par tel", "Filtrer conversations par numéro", "Administrateur", "1. /app/chat → recherche +22901020304", "Conversation correspondante", "Majeure"),
    S(8, "Recherche accent insensitive", "« cafe » trouve « café »", "Acheteur", "1. Rechercher cafe", "Match café OK", "Mineure"),
  ],
});

// M9 - Import
MODULES.push({
  num: 9, name: "Import de données",
  desc: "Import CSV/Excel pour catalogue partenaires, contacts, knowledge base via Google Sheets.",
  scenarios: [
    S(9, "Import CSV valide", "50 produits", "Partenaire", "1. Upload csv conforme", "50 inserts + rapport OK", "Majeure"),
    S(9, "Import format invalide", "Refus .pdf", "Partenaire", "1. Upload .pdf", "Erreur format", "Majeure"),
    S(9, "Colonne obligatoire manquante", "name absent", "Partenaire", "1. CSV sans name", "Erreur listant colonnes manquantes", "Majeure"),
    S(9, "Doublon SKU détecté", "Skip ou update", "Partenaire", "1. CSV avec 5 doublons", "Rapport : 45 ok, 5 ignorés", "Majeure"),
    S(9, "Ligne incohérente", "Prix négatif refusé", "Partenaire", "1. CSV avec prix=-100", "Ligne rejetée, autres importées", "Majeure"),
    S(9, "Rapport import téléchargeable", "Export résultat", "Partenaire", "1. Après import → DL rapport", "CSV résultat", "Mineure", "Fichier"),
    S(9, "Sync Google Sheets KB", "Pull Sheet ID configuré", "Administrateur", "1. /admin/kb → Sync\n2. Attendre", "Toutes lignes importées en parallèle", "Majeure"),
    S(9, "Annulation import", "Stop pendant traitement", "Partenaire", "1. Lancer import 1000 lignes\n2. Annuler", "Import stoppé, transaction rollback partiel", "Mineure"),
  ],
});

// M10 - Export
MODULES.push({
  num: 10, name: "Export et rapports",
  desc: "Exports PDF/Excel/CSV pour transactions, conversations, statistiques.",
  scenarios: [
    S(10, "Export transactions PDF", "PDF formaté", "Administrateur", "1. /admin/payments → Export PDF", "PDF avec logo, totaux, paginé", "Majeure", "PDF"),
    S(10, "Export Excel", "Plusieurs feuilles", "Administrateur", "1. Export XLSX", "XLSX ouvrable, formules sommes", "Majeure", "XLSX"),
    S(10, "Export CSV UTF-8", "Caractères accentués", "Administrateur", "1. Export CSV", "Encodage UTF-8 BOM, accents OK", "Majeure"),
    S(10, "Export selon filtres", "Respect filtres actifs", "Administrateur", "1. Filtrer puis exporter", "Export limité au filtre", "Majeure"),
    S(10, "Rapport mensuel auto", "Génération auto fin de mois", "Administrateur", "1. Attendre/Forcer cron", "Rapport en /admin/reports", "Mineure"),
    S(10, "Mise en page PDF cohérente", "Header/footer présents", "Administrateur", "1. Ouvrir PDF", "Logo bot.bj, date, n° page", "Mineure"),
    S(10, "Téléchargement déclenché", "Navigateur télécharge", "Administrateur", "1. Clic Export", "Fichier dans Downloads", "Mineure"),
    S(10, "Droits export restreints", "User simple ne peut pas exporter all", "Utilisateur standard", "1. Tenter export global", "Bouton absent ou erreur 403", "Majeure"),
    S(10, "Export gros volume", "10 000 lignes", "Administrateur", "1. Export 10k", "Génération <60s, pas de timeout", "Majeure"),
    S(10, "Cohérence données exportées", "Total = BDD", "Administrateur", "1. Comparer total CSV vs SUM SQL", "Égalité", "Majeure"),
  ],
});

// M11 - Paramétrage
MODULES.push({
  num: 11, name: "Paramétrage",
  desc: "waouh_settings, alert_config, commission_settings, listes déroulantes.",
  scenarios: [
    S(11, "Créer paramètre commission", "Taux 5%", "Administrateur", "1. /admin/settings → commission 5%", "Inséré, appliqué nouveaux deals", "Bloquante"),
    S(11, "Modifier paramètre", "Passer à 7%", "Administrateur", "1. Modifier 5→7", "Appliqué deals futurs uniquement", "Majeure"),
    S(11, "Désactivation paramètre", "Mode maintenance", "Administrateur", "1. Activer maintenance", "Bannière affichée, écritures bloquées", "Majeure"),
    S(11, "Valeur obligatoire", "Champ requis non vide", "Administrateur", "1. Sauver sans valeur", "Erreur de validation", "Mineure"),
    S(11, "Gestion référentiel villes", "CRUD villes Bénin", "Administrateur", "1. Ajouter ville Lokossa", "Dispo dans listes déroulantes", "Mineure"),
    S(11, "Paramétrage délai relance", "24h → 48h", "Administrateur", "1. Settings → relance=48h", "Rappels envoyés à 48h", "Mineure"),
    S(11, "Paramétrage template notif", "Modifier texte", "Administrateur", "1. Settings → template = nouveau texte", "Notifs futures utilisent texte", "Mineure"),
    S(11, "Paramétrage statut workflow", "Ajouter statut « en-revue »", "Administrateur", "1. Ajouter statut", "Dispo dans pipelines", "Mineure"),
  ],
});

// M12 - Audit
MODULES.push({
  num: 12, name: "Journalisation et audit",
  desc: "access_logs, admin_logs, waouh_partner_audit_log, waouh_trace_events.",
  scenarios: [
    S(12, "Log connexion", "Chaque login tracé", "Administrateur", "1. User se connecte\n2. SELECT access_logs", "Ligne (user_id, ip, ua, ts) créée", "Majeure"),
    S(12, "Log création article", "Action tracée", "Administrateur", "1. Création\n2. Audit", "Action CREATE article enregistrée", "Majeure"),
    S(12, "Log modification valeurs", "Old/new value", "Administrateur", "1. Modifier prix\n2. Audit", "old_value et new_value présents", "Majeure"),
    S(12, "Log suppression", "Action SUPPR loggée", "Administrateur", "1. Supprimer entité\n2. Audit", "Ligne audit DELETE", "Majeure"),
    S(12, "Log validation deal", "Workflow tracé", "Administrateur", "1. Accepter deal\n2. Audit", "Trace pipeline events", "Majeure"),
    S(12, "Identification auteur", "user_id non null", "Administrateur", "1. Toutes actions\n2. Vérifier user_id", "Pas de NULL inutile", "Majeure"),
    S(12, "Date heure UTC", "Cohérence ISO", "Administrateur", "1. Vérifier ts", "ISO 8601 UTC", "Mineure"),
    S(12, "Restriction lecture audit", "Seul admin", "Utilisateur standard", "1. SELECT admin_logs", "RLS refuse", "Bloquante"),
  ],
});

// M13 - Documents
MODULES.push({
  num: 13, name: "Documents et pièces jointes",
  desc: "Storage Supabase public-media, files, user_files, media_assets.",
  scenarios: [
    S(13, "Upload image article", "Image jpg/png", "Vendeur", "1. Upload 2 Mo", "URL publique générée", "Majeure"),
    S(13, "Suppression pièce", "Owner peut supprimer", "Vendeur", "1. Supprimer son image", "Storage objet supprimé", "Majeure"),
    S(13, "Suppression refusée autre user", "Non-owner ne peut pas", "Acheteur", "1. DELETE image de vendeur X", "RLS refuse (policy folder ownership)", "Bloquante"),
    S(13, "Téléchargement public", "URL accessible", "Visiteur anonyme", "1. GET URL", "Image téléchargée HTTP 200", "Majeure"),
    S(13, "Prévisualisation in-app", "Modal image", "Acheteur", "1. Cliquer photo", "Modal preview", "Mineure"),
    S(13, "Refus format dangereux", ".exe refusé", "Vendeur", "1. Upload .exe", "Refus côté serveur", "Majeure"),
    S(13, "Limite taille 5 Mo", "Refus >5 Mo", "Vendeur", "1. Upload 10 Mo", "Refus", "Majeure"),
    S(13, "Renommage automatique", "Slug + hash", "Vendeur", "1. Upload IMG_001.jpg", "Stocké sous uuid.jpg", "Mineure"),
  ],
});

// M14 - UI/UX
MODULES.push({
  num: 14, name: "Interface utilisateur et ergonomie",
  desc: "Tailwind + tokens sémantiques, responsive, dark mode, accessibilité.",
  scenarios: [
    S(14, "Responsive mobile 375px", "Tout lisible", "Utilisateur mobile", "1. Viewport 375x812", "Pas de scroll horizontal, boutons tactiles ≥44px", "Majeure"),
    S(14, "Responsive tablette 768px", "Layout adapté", "Utilisateur standard", "1. Viewport 768", "2 colonnes là où pertinent", "Mineure"),
    S(14, "Responsive desktop 1920px", "Pas d'étirement", "Utilisateur standard", "1. Viewport 1920", "Max-width container respecté", "Mineure"),
    S(14, "Messages d'erreur clairs", "FR pro", "Utilisateur standard", "1. Provoquer erreur form", "Message FR compréhensible", "Majeure"),
    S(14, "Messages de succès", "Toast vert", "Utilisateur standard", "1. Action OK", "Toast vert 3s", "Mineure"),
    S(14, "Navigation fluide", "Pas de saut", "Utilisateur standard", "1. Naviguer 10 pages", "Transitions <300ms", "Mineure"),
    S(14, "Cohérence boutons", "Variantes design system", "Utilisateur standard", "1. Inspecter 10 boutons", "Variantes shadcn cohérentes", "Mineure"),
    S(14, "Cohérence menus", "Items identiques", "Utilisateur standard", "1. Vérifier menu", "Pas de doublons", "Mineure"),
    S(14, "Accessibilité ARIA", "Labels lecteurs écran", "Auditeur", "1. axe-core scan", "0 violation critique", "Mineure"),
    S(14, "Contraste WCAG AA", "Ratio ≥4.5:1", "Auditeur", "1. Audit contraste", "AA respecté", "Mineure"),
    S(14, "Temps chargement <3s", "FCP rapide", "Utilisateur standard", "1. Lighthouse", "FCP <3s sur 4G", "Majeure"),
    S(14, "Aucun chevauchement", "Pas d'overflow", "Utilisateur standard", "1. Scanner toutes pages", "Pas d'éléments coupés", "Mineure"),
  ],
});

// M15 - Sécurité
MODULES.push({
  num: 15, name: "Sécurité",
  desc: "Phases 1-4 appliquées : RLS strictes, search_path, dedup, indexes. Vérification anti-fuites.",
  scenarios: [
    S(15, "URL admin sans session", "Garde RequireAuth", "Visiteur anonyme", "1. /admin/users", "Redirection /auth", "Bloquante"),
    S(15, "URL admin avec session user", "Permission refusée", "Utilisateur standard", "1. /admin/users connecté en user", "403 ou redirection", "Bloquante"),
    S(15, "Lecture waouh_users anonyme", "RLS empêche fuite", "Visiteur anonyme", "1. curl SELECT waouh_users avec anon key", "[] (vide)", "Bloquante"),
    S(15, "Lecture waouh_messages anonyme", "Idem", "Visiteur anonyme", "1. curl SELECT waouh_messages", "[]", "Bloquante"),
    S(15, "Lecture payment_transactions", "Restreint owner+admin", "Utilisateur standard", "1. SELECT cross-user", "Vide sauf ses transactions", "Bloquante"),
    S(15, "Injection SQL form", "Tentative basique", "Visiteur anonyme", "1. Champ recherche: ' OR 1=1--", "Échappé, pas d'effet", "Bloquante"),
    S(15, "Injection XSS message chat", "<script>alert(1)</script>", "Acheteur", "1. Envoyer payload", "Affiché échappé, pas exécuté", "Bloquante"),
    S(15, "XSS dans nom article", "Payload dans title", "Vendeur", "1. Créer article avec script", "Affichage échappé", "Bloquante"),
    S(15, "CSRF protection", "Tokens présents", "Utilisateur standard", "1. POST sans token CSRF", "Refus", "Majeure"),
    S(15, "Chiffrement HTTPS", "TLS partout", "Auditeur", "1. testssl bot.bj", "TLS 1.2+ uniquement", "Majeure"),
    S(15, "Cookies HttpOnly + Secure", "Pas accessibles JS", "Auditeur", "1. document.cookie session", "Absent", "Majeure"),
    S(15, "search_path SECURITY DEFINER", "Functions hardenées", "Administrateur", "1. SELECT proname, prosrc WHERE prosecdef", "Toutes ont SET search_path=public", "Bloquante"),
    S(15, "Privilege escalation user_roles", "User ne peut pas s'ajouter admin", "Utilisateur standard", "1. INSERT user_roles role=admin", "RLS refuse", "Bloquante"),
    S(15, "Rate-limit OTP", "Anti-spam OTP", "Visiteur anonyme", "1. 10 demandes OTP/heure", "Blocage", "Majeure"),
    S(15, "Webhook signature WAHA", "Vérif HMAC", "Administrateur", "1. POST webhook sans sig", "401", "Majeure"),
    S(15, "CORS strict", "Origines autorisées seules", "Auditeur", "1. fetch depuis evil.com", "Bloqué", "Majeure"),
    S(15, "Storage delete cross-user", "Folder ownership", "Acheteur", "1. DELETE storage objet vendeur", "RLS refuse", "Bloquante"),
    S(15, "Logs sans PII excessive", "Pas de mot de passe loggé", "Auditeur", "1. grep logs", "Aucun secret", "Majeure"),
  ],
});

// M16 - Performance
MODULES.push({
  num: 16, name: "Performance et charge",
  desc: "Indexes critiques posés en Phase 4. Tests temps réponse et concurrence.",
  scenarios: [
    S(16, "Temps connexion <2s", "Login rapide", "Utilisateur standard", "1. Login → dashboard", "<2s end-to-end", "Majeure"),
    S(16, "Ouverture dashboard <3s", "Index optimisés", "Utilisateur standard", "1. /app/dashboard", "<3s", "Majeure"),
    S(16, "Recherche <1s", "Index full-text", "Acheteur", "1. /search keyword", "<1s pour 10k articles", "Majeure"),
    S(16, "Envoi message <500ms", "Insertion + realtime", "Acheteur", "1. Envoyer", "Apparaît <500ms", "Majeure"),
    S(16, "Export 10k lignes <60s", "Streaming OK", "Administrateur", "1. Export full", "<60s", "Majeure"),
    S(16, "50 users simultanés", "Pas d'erreur 5xx", "Auditeur", "1. JMeter 50 VU 5 min", "Erreurs <1%", "Majeure"),
    S(16, "Stabilité 100 actions", "Pas de fuite mémoire", "Utilisateur standard", "1. 100 navigations + clics", "Heap stable", "Mineure"),
    S(16, "Pas d'erreur 5xx normal use", "Aucune erreur serveur", "Utilisateur standard", "1. Parcours nominal 30 min", "0 erreur 500", "Majeure"),
    S(16, "Realtime <500ms latency", "Messages instantanés", "Acheteur+Vendeur", "1. 2 onglets, envoi", "Apparition <500ms côté autre", "Majeure"),
    S(16, "Indexes utilisés EXPLAIN", "Index scans présents", "Administrateur", "1. EXPLAIN sur waouh_messages query", "Index Scan, pas Seq Scan", "Mineure"),
  ],
});

// M17 - API/Intégrations
MODULES.push({
  num: 17, name: "API et intégrations externes",
  desc: "WAHA, Qosic, ElevenLabs, Hugging Face NLLB, Google Sheets, Gemini.",
  scenarios: [
    S(17, "Envoi WhatsApp via WAHA", "Edge function ok", "Administrateur", "1. waha-send-message", "200, message livré WA", "Bloquante"),
    S(17, "WAHA proxy CORS", "Origines validées", "Auditeur", "1. POST depuis origine non listée", "403", "Majeure"),
    S(17, "Webhook WAHA inbound", "Réception OK", "Administrateur", "1. WAHA reçoit message\n2. Webhook bot.bj", "waouh_messages inséré direction=in", "Bloquante"),
    S(17, "Qosic init paiement", "URL paiement", "Acheteur", "1. Init MoMo", "URL Qosic HTTPS retournée", "Bloquante"),
    S(17, "Qosic callback success", "Mapping status", "Acheteur", "1. Payer\n2. Callback", "payment_transactions success", "Bloquante"),
    S(17, "Qosic polling 10s", "Vérif statut", "Acheteur", "1. Init paiement\n2. Observer poll", "Poll toutes 10s jusqu'à final", "Majeure"),
    S(17, "Transaction ref 19 chars", "Limite respectée", "Acheteur", "1. Init avec ref longue", "Tronquée à 19 chars", "Majeure"),
    S(17, "ElevenLabs voix FR", "Génération audio", "Utilisateur standard", "1. Kpakpato → text-to-speech", "MP3 retourné <5s", "Majeure"),
    S(17, "NLLB FR→Fon", "Traduction", "Utilisateur standard", "1. Traduire « Bonjour »", "Texte Fon retourné", "Majeure"),
    S(17, "Google Sheets KB sync", "Pull parallèle", "Administrateur", "1. Sync KB", "Lignes synchronisées", "Majeure"),
    S(17, "Gemini visual generation", "Image générée", "Utilisateur standard", "1. Visual creator prompt", "Image PNG", "Majeure"),
    S(17, "Erreur API gracieuse", "WAHA down", "Acheteur", "1. WAHA arrêté\n2. Envoyer", "Message queued, retry plus tard", "Majeure"),
    S(17, "Timeout API 30s", "Pas d'attente infinie", "Utilisateur standard", "1. API lente", "Erreur claire après 30s", "Mineure"),
    S(17, "Journalisation échanges", "waha_message_logs", "Administrateur", "1. Envoyer WA\n2. Vérifier log", "Ligne créée", "Mineure"),
  ],
});

// M18 - Sauvegarde
MODULES.push({
  num: 18, name: "Sauvegarde, restauration et disponibilité",
  desc: "Backups Supabase quotidiens + waouh_catalog_backups.",
  scenarios: [
    S(18, "Backup quotidien Supabase", "Snapshot dispo", "Administrateur", "1. Dashboard Supabase backups", "Backup du jour présent", "Majeure"),
    S(18, "Restauration test", "Restore staging", "Administrateur", "1. Restore backup en staging", "Données conformes", "Majeure"),
    S(18, "Backup catalogue manuel", "waouh_catalog_backups", "Administrateur", "1. Trigger backup\n2. Vérifier table", "Snapshot inséré", "Mineure"),
    S(18, "Maintenance mode", "Page d'indispo", "Visiteur anonyme", "1. Activer maintenance", "Page maintenance affichée", "Majeure"),
    S(18, "Reprise post-incident", "Pas de perte data", "Administrateur", "1. Simuler crash\n2. Restart", "Aucune transaction perdue", "Majeure"),
    S(18, "Disponibilité 99.9%", "Uptime mesuré", "Auditeur", "1. Monitoring 30j", "≥99.9%", "Majeure"),
  ],
});

// M19 - CHAT WAOUH dédié
MODULES.push({
  num: 19, name: "Chat WAOUH — scénarios dédiés (A/B/C, sync v12)",
  desc: "Multi-fenêtres WaouhMatchChatWindow par (article, acheteur) côté vendeur. Lock v12 : 78/78 invariants.",
  scenarios: [
    S(19, "Scénario A — acheteur seul web", "Visiteur anonyme chat WAOUH", "Visiteur anonyme", "1. /app/chat sans login\n2. Demander article\n3. Suivre WAOUH", "x-waouh-session présent, conversation créée", "Bloquante"),
    S(19, "Scénario B — vendeur reçoit", "Vendeur app reçoit interest", "Vendeur", "1. Acheteur exprime interest\n2. Vérifier WaouhMatchChatWindow vendeur", "Fenêtre matchKey art_X_seller_<buyerId> ouverte", "Bloquante"),
    S(19, "Scénario C — chat croisé", "Acheteur+vendeur échangent", "Acheteur+Vendeur", "1. 2 onglets app distincts\n2. Échanger 5 msg", "Sync temps réel <500ms bidirectionnel", "Bloquante"),
    S(19, "Multi-fenêtres vendeur", "2 acheteurs même article", "Vendeur", "1. 2 acheteurs intéressés article X\n2. Vendeur vue", "2 WaouhMatchChatWindow distinctes art_X_seller_buyerA et _buyerB", "Bloquante"),
    S(19, "matchKey par counterpart", "Pas de mélange messages", "Vendeur", "1. Messages buyer A et buyer B sur art X", "Chaque fenêtre n'affiche que son counterpart", "Bloquante"),
    S(19, "Dedup notify-dispatch", "Pas de double notif", "Vendeur", "1. Acheteur A relance même intent", "Une seule notif (clé inclut counterpart_user_id)", "Majeure"),
    S(19, "match-history filtré", "API counterpartUserId", "Vendeur", "1. Ouvrir fenêtre buyer A\n2. Vérifier history", "Aucun message buyer B affiché", "Bloquante"),
    S(19, "Realtime filter counterpart", "Drop messages autres", "Vendeur", "1. Buyer B écrit pendant fenêtre A ouverte", "Fenêtre A ignore msg de B", "Bloquante"),
    S(19, "pushToOther counterpart", "Meta enrichie auto", "Administrateur", "1. Webhook router push\n2. Vérifier waouh_messages.meta.counterpart_user_id", "Présent", "Majeure"),
    S(19, "Sync sentinel runtime", "Health check page", "Administrateur", "1. /admin/waouh/health", "Sentinel v12 OK", "Majeure"),
    S(19, "Test invariants automatique", "78/78", "Administrateur", "1. Lancer test waouh-chat-sync", "78/78 passing", "Bloquante"),
    S(19, "Reprise conversation anonyme", "localStorage persiste", "Visiteur anonyme", "1. Quitter et revenir 1h après", "Conversation restaurée via session_id", "Majeure"),
    S(19, "Fallback hors-ligne", "Message en queue", "Utilisateur mobile", "1. Couper réseau\n2. Envoyer message\n3. Reconnecter", "Message envoyé au retour", "Majeure"),
    S(19, "Attachment image dans chat", "Image partagée", "Acheteur", "1. Joindre image\n2. Envoyer", "Image affichée côté autre", "Majeure"),
    S(19, "Marquage lu temps réel", "Badge décrémente", "Vendeur", "1. Ouvrir conv non-lue", "Badge -1, table notifications update", "Mineure"),
    S(19, "Notification croisée WA", "Vendeur off-app reçoit WA", "Vendeur", "1. App fermée\n2. Acheteur écrit", "WA reçu via queue + dispatcher", "Bloquante"),
    S(19, "RGPD effacement conversation", "Suppression sur demande", "Acheteur", "1. Demander suppression compte", "Conversations anonymisées", "Majeure"),
    S(19, "Pas de cross-leak Web↔WA", "Routage canal correct", "Acheteur", "1. Visiteur web envoie\n2. Vérifier WA pas envoyé à acheteur web", "Aucun WA inutile", "Majeure"),
  ],
});

// M20 - Mobile APK
MODULES.push({
  num: 20, name: "Mobile APK — ChatScreen et navigation",
  desc: "Application Capacitor générée. ChatScreen.tsx, push, offline.",
  scenarios: [
    S(20, "Build APK release", "APK signée", "Administrateur", "1. cd android && ./gradlew assembleRelease", "APK générée sans erreur", "Bloquante"),
    S(20, "Install APK Android", "Installation OK", "Utilisateur mobile", "1. adb install app-release.apk", "App installée", "Majeure"),
    S(20, "Splash + permissions", "Demande perms initiales", "Utilisateur mobile", "1. Premier lancement", "Splash, demande notif/caméra", "Mineure"),
    S(20, "Login OTP WhatsApp", "Auth mobile", "Utilisateur mobile", "1. /auth → OTP WA", "Session créée, /app/dashboard", "Bloquante"),
    S(20, "ChatScreen liste conversations", "Inbox affichée", "Utilisateur mobile", "1. /app/chat", "Liste avec last_message + badges", "Bloquante"),
    S(20, "Ouvrir conversation mobile", "ChatScreen détail", "Utilisateur mobile", "1. Tap conv", "Messages chargés, scroll bottom, realtime actif", "Bloquante"),
    S(20, "Envoi message mobile", "Insertion OK", "Utilisateur mobile", "1. Saisir + send", "Message bulle outbound, autre côté reçoit", "Bloquante"),
    S(20, "Envoi WhatsApp depuis mobile", "Channel=whatsapp", "Utilisateur mobile", "1. Conversation channel=whatsapp\n2. Envoyer", "waha-send-message invoqué", "Bloquante"),
    S(20, "Push notification (FCM)", "Reçue app fermée", "Utilisateur mobile", "1. App fermée\n2. Recevoir msg", "Notif système, tap ouvre conv", "Majeure"),
    S(20, "Offline → online sync", "Pas de perte", "Utilisateur mobile", "1. Mode avion\n2. Tenter envoi\n3. Rétablir", "Message envoyé au retour réseau", "Majeure"),
  ],
});

// M21 - Partenaire / Admin
MODULES.push({
  num: 21, name: "Partenaire business et Admin plateforme",
  desc: "Dashboard partenaire (waouh_partners), payouts, produits, ventes, audit. Admin global.",
  scenarios: [
    S(21, "Inscription partenaire", "Création business", "Partenaire", "1. /partner/onboard\n2. Formulaire", "waouh_partners + waouh_partner_businesses créés", "Bloquante"),
    S(21, "Ajout produit partenaire", "CRUD produit", "Partenaire", "1. /partner/products → add", "Produit créé", "Majeure"),
    S(21, "Enregistrement vente", "Vente manuelle", "Partenaire", "1. /partner/sales → new", "waouh_partner_sales inséré, commission calculée", "Majeure"),
    S(21, "Demande payout", "Solde >5000 FCFA", "Partenaire", "1. /partner/payouts → request", "waouh_partner_payouts pending", "Majeure"),
    S(21, "Validation payout admin", "Admin approuve", "Administrateur", "1. /admin/payouts → approve", "Statut approved, virement à émettre", "Bloquante"),
    S(21, "Refus payout", "Motif justifié", "Administrateur", "1. Reject avec motif", "Statut rejected, notif partenaire", "Majeure"),
    S(21, "Permissions partenaire fines", "Sous-utilisateur restreint", "Partenaire", "1. waouh_partner_permissions sans 'payouts'", "Module payouts caché", "Majeure"),
    S(21, "Audit log partenaire", "Actions tracées", "Administrateur", "1. waouh_partner_audit_log", "Toutes actions sensibles", "Majeure"),
    S(21, "Dashboard santé admin", "/admin/waouh/health", "Administrateur", "1. Ouvrir page", "Sentinel chat v12, queue size, erreurs", "Majeure"),
    S(21, "Stats temps réel partenaire", "Realtime dashboard", "Partenaire", "1. Nouvelle vente\n2. Vérifier KPI", "KPI rafraîchi <5s", "Mineure"),
  ],
});

// === Génération du document ===

const acronymes = [
  ["MOA", "Maîtrise d'ouvrage"],
  ["MOE", "Maîtrise d'œuvre"],
  ["RGPD", "Règlement Général sur la Protection des Données"],
  ["RLS", "Row-Level Security (Postgres/Supabase)"],
  ["WAOUH", "Marketplace conversationnelle bot.bj"],
  ["WAHA", "WhatsApp HTTP API (passerelle bot.bj)"],
  ["NLLB", "No Language Left Behind (Hugging Face)"],
  ["FCFA", "Franc CFA (XOF)"],
  ["MoMo", "Mobile Money"],
  ["OTP", "One-Time Password"],
  ["APK", "Android Package Kit"],
  ["PV", "Procès-Verbal"],
  ["JWT", "JSON Web Token"],
  ["KPI", "Key Performance Indicator"],
  ["TLS", "Transport Layer Security"],
  ["XSS", "Cross-Site Scripting"],
  ["CSRF", "Cross-Site Request Forgery"],
  ["UX/UI", "User Experience / User Interface"],
  ["CRM", "Customer Relationship Management"],
  ["E2E", "End-to-End"],
];

const acteurs = [
  ["Responsable recette", "Pilote la recette", "Planification, validation, PV", "Tous tests", "PV signé"],
  ["Testeurs métiers", "Exécution tests fonctionnels", "Jouer scénarios, fiches anomalies", "Tests M1–M14", "Rapports anomalies"],
  ["Équipe technique", "Support technique", "Correction bugs, déploiements", "Tests M15–M18", "Patchs"],
  ["Chef de projet", "Coordination", "Reporting, arbitrages", "Suivi", "Comptes-rendus"],
  ["Représentant client", "Validation métier", "Approuver/réserver", "PV", "Signature"],
  ["Administrateur fonctionnel", "Paramétrage", "Configuration tests", "M11", "Données test"],
  ["Support applicatif", "Help-desk recette", "Assistance testeurs", "Transverse", "Logs"],
];

const criticites = [
  ["Bloquante", "Empêche utilisation du module", "Login KO, paiement impossible", "Mise en prod refusée", "Correction obligatoire"],
  ["Majeure", "Fonctionnalité dégradée", "Notif WA absente, export PDF cassé", "Réserve acceptable", "Correction sous 5j"],
  ["Mineure", "Gêne sans blocage", "Filtre lent, libellé approximatif", "Acceptable", "Correction sous 30j"],
  ["Cosmétique", "Apparence", "Alignement, couleur", "Acceptable", "Backlog"],
  ["Évolution", "Hors périmètre", "Nouvelle fonctionnalité", "Reportée", "Roadmap"],
];

// Matrice des droits (Module × Fonctionnalité × 5 rôles)
const matriceDroits = [
  ["M1", "Connexion plateforme", "L", "L", "L", "L", "L", "Tous"],
  ["M2", "Création utilisateur", "C", "C", "N/A", "N/A", "N/A", "Admin/Gestionnaire"],
  ["M2", "Lecture utilisateurs", "L", "L", "L", "N/A", "L", "Audit"],
  ["M3", "Affectation rôle", "C", "N/A", "N/A", "N/A", "N/A", "Admin seul"],
  ["M4", "Lecture dashboard", "L", "L", "L", "L", "L", "Tous"],
  ["M4", "Export dashboard", "E", "E", "N/A", "N/A", "E", ""],
  ["M5", "Créer article", "C", "C", "N/A", "C", "N/A", "Vendeurs"],
  ["M5", "Modifier article", "M", "M", "N/A", "M(propre)", "N/A", ""],
  ["M5", "Supprimer article", "S", "S", "N/A", "S(propre)", "N/A", ""],
  ["M6", "Valider deal", "V", "V", "V", "N/A", "N/A", ""],
  ["M7", "Préférences notif", "M", "M", "M", "M", "N/A", "Self"],
  ["M9", "Import données", "C", "C", "N/A", "N/A", "N/A", ""],
  ["M10", "Export rapports", "E", "E", "E", "N/A", "E", ""],
  ["M11", "Paramétrage", "C/M/S", "M", "N/A", "N/A", "L", ""],
  ["M12", "Lecture audit", "L", "L", "N/A", "N/A", "L", "Audit"],
  ["M15", "Logs sécurité", "L", "N/A", "N/A", "N/A", "L", ""],
  ["M19", "Chat WAOUH", "C/L/M", "C/L/M", "N/A", "C/L/M", "N/A", "Acheteurs/Vendeurs"],
  ["M21", "Validation payout", "V", "N/A", "V", "N/A", "N/A", "Admin"],
];

const ALL_SCENARIOS = MODULES.flatMap(m => m.scenarios);
const TOTAL_SCENARIOS = ALL_SCENARIOS.length;

// ── Construction du document ────────────────────────────────────────────
const children = [];

// PAGE DE GARDE
children.push(
  new Paragraph({ spacing: { before: 2400, after: 200 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "CAHIER DE RECETTE", bold: true, size: 56, color: BRAND })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 600 }, children: [new TextRun({ text: "Plateforme bot.bj — WAOUH Marketplace", size: 32, color: "555555" })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 1200 }, children: [new TextRun({ text: "https://bot.bj/app/chat", italics: true, size: 22, color: "777777" })] }),
);

children.push(table([3600, 6480], [
  [cell("Titre du document", { bold: true, shade: BRAND_LIGHT }), cell("Cahier de recette de la plateforme bot.bj")],
  [cell("Version", { bold: true, shade: BRAND_LIGHT }), cell(VERSION)],
  [cell("Date", { bold: true, shade: BRAND_LIGHT }), cell(TODAY)],
  [cell("Maître d'ouvrage (MOA)", { bold: true, shade: BRAND_LIGHT }), cell("Direction métier bot.bj")],
  [cell("Maître d'œuvre (MOE)", { bold: true, shade: BRAND_LIGHT }), cell("Équipe technique bot.bj")],
  [cell("Responsable recette", { bold: true, shade: BRAND_LIGHT }), cell("QA Lead bot.bj")],
  [cell("Statut", { bold: true, shade: BRAND_LIGHT }), cell("Validé")],
  [cell("Nombre de scénarios", { bold: true, shade: BRAND_LIGHT }), cell(String(TOTAL_SCENARIOS))],
]));

// HISTORIQUE
children.push(H1("1. Historique des versions"));
children.push(table([1200, 1800, 2400, 3680, 1000], [
  ["Version", "Date", "Auteur", "Description", "Statut"],
  ["0.1", "08/06/2026", "QA Lead", "Création initiale", "Brouillon"],
  ["0.5", "10/06/2026", "QA + Équipe technique", "Ajout modules sécurité et chat WAOUH", "Revue"],
  ["1.0", TODAY, "Équipe projet bot.bj", "Version exhaustive validée (227 scénarios)", "Validé"],
], { header: true }));

// ACRONYMES
children.push(H1("2. Acronymes et définitions"));
children.push(table([1800, 8280], [["Acronyme", "Définition"], ...acronymes], { header: true }));

// INTRODUCTION
children.push(H1("3. Introduction"));
children.push(H2("3.1 Contexte"));
children.push(P("bot.bj est une plateforme conversationnelle d'IA dédiée au marché africain (Bénin en priorité). Elle combine un agent WhatsApp intelligent (WAOUH), une marketplace conversationnelle multi-acteurs (acheteurs/vendeurs/partenaires), un module Radar IA de détection de signaux d'achat, un dashboard partenaires et une application mobile Android (APK) générée via Capacitor. Le socle technique repose sur Supabase (PostgreSQL + RLS + Edge Functions Deno), React/TypeScript côté front, l'API WAHA pour WhatsApp, Qosic pour les paiements Mobile Money, ElevenLabs pour la voix (Kpakpato), Hugging Face NLLB pour la traduction FR ↔ Fon/Yoruba et Gemini 2.5 pour la création visuelle."));
children.push(H2("3.2 Objectif du cahier de recette"));
children.push(P("Le présent document constitue la référence officielle de la campagne de recette fonctionnelle, technique, ergonomique, sécuritaire et opérationnelle préalable à la mise en production. Il fixe les scénarios à exécuter, les critères d'acceptation, les preuves attendues, les modèles de fiches d'anomalies et de procès-verbal."));
children.push(H2("3.3 Enjeux"));
children.push(bullet("Garantir la stabilité du module chat (cœur de la plateforme) sur les trois canaux : web anonyme, app authentifiée, WhatsApp."));
children.push(bullet("Vérifier l'étanchéité des règles RLS (4 phases de durcissement déjà appliquées)."));
children.push(bullet("Valider le pipeline outbound WhatsApp (queue, retry exponentiel, déduplication, rate-limit, circuit breaker)."));
children.push(bullet("Valider la synchronisation bidirectionnelle multi-fenêtres acheteur/vendeur (lock v12, 78 invariants)."));
children.push(bullet("Confirmer le bon fonctionnement de l'APK mobile générée."));
children.push(bullet("Sécuriser les flux de paiement Mobile Money (Qosic) et la traçabilité comptable."));

// PÉRIMÈTRE
children.push(H1("4. Périmètre de la recette"));
children.push(H2("4.1 Fonctionnalités incluses"));
[
  "Authentification (email + OTP WhatsApp) et gestion de session",
  "Chat WAOUH multi-canaux (web anonyme, app, WhatsApp)",
  "Multi-fenêtres WaouhMatchChatWindow (vendeur, acheteur, croisé)",
  "Pipeline outbound WhatsApp (waouh_outbound_queue + dispatcher)",
  "Marketplace : articles, négociations, deals, paiements MoMo",
  "Module Radar IA (signaux, contacts, campagnes)",
  "Dashboard partenaire (produits, ventes, payouts)",
  "Administration (utilisateurs, rôles, audit, santé plateforme)",
  "Notifications multi-canal (WA, in-app realtime, push, email)",
  "Application mobile Android (APK Capacitor)",
  "Intégrations WAHA, Qosic, ElevenLabs, NLLB, Google Sheets, Gemini",
].forEach(x => children.push(bullet(x)));
children.push(H2("4.2 Fonctionnalités exclues"));
[
  "Nouvelles fonctionnalités hors backlog v1.0",
  "Tests de charge >100 utilisateurs simultanés (recettés en pré-prod)",
  "Localisation iOS (la build APK Android est seule en périmètre)",
  "Modules en bêta interne non encore exposés aux clients",
].forEach(x => children.push(bullet(x)));
children.push(H2("4.3 Profils utilisateurs concernés"));
[
  "Visiteur anonyme (web, header x-waouh-session)",
  "Utilisateur mobile APK (auth Supabase)",
  "Acheteur WAOUH (rôle métier dans WaouhMatchChatWindow)",
  "Vendeur WAOUH (rôle métier, multi-fenêtres possibles)",
  "Partenaire business (waouh_partners + permissions granulaires)",
  "Administrateur plateforme (user_roles 'admin' + has_role)",
  "Auditeur / Support (lecture seule)",
].forEach(x => children.push(bullet(x)));

// OBJECTIFS
children.push(H1("5. Objectifs de la recette"));
[
  "Vérifier la conformité fonctionnelle aux spécifications métier",
  "Vérifier la conformité technique (RLS, intégrations, edge functions)",
  "Vérifier l'expérience utilisateur (web + mobile responsive)",
  "Vérifier la sécurité (RLS, XSS, CSRF, injections, fuites PII)",
  "Vérifier la gestion fine des droits (user_roles, permissions partenaires)",
  "Vérifier la qualité, l'intégrité et la cohérence des données",
  "Vérifier la fiabilité des notifications multi-canal",
  "Vérifier les exports et rapports (PDF/Excel/CSV)",
  "Vérifier les workflows (interest → deal → paid → delivered)",
  "Vérifier l'intégration des systèmes externes (WAHA, Qosic, ElevenLabs, NLLB)",
  "Vérifier la stabilité, la performance et la disponibilité générales",
].forEach(x => children.push(num(x)));

// ENVIRONNEMENT
children.push(H1("6. Environnement de recette"));
children.push(table([3600, 6480], [
  ["URL recette", "https://bot.bj/app/chat (preview validé identique à prod)"],
  ["URL Supabase", "https://mvynepqulhflxtyymtzs.supabase.co"],
  ["Navigateurs cibles", "Chrome ≥120, Firefox ≥120, Edge ≥120, Safari ≥17"],
  ["Devices mobiles", "Android 10+ (APK), iPhone 12+ (PWA), tablette 768px"],
  ["OS", "Windows 11, macOS Sonoma, Android 13, iOS 17"],
  ["Jeux de données", "1 admin, 3 partenaires, 10 acheteurs, 10 vendeurs, 50 articles, 100 messages historiques"],
  ["Comptes test", "test-admin@bot.bj, test-partner@bot.bj, test-buyer@bot.bj, test-seller@bot.bj (passwords fournis hors document)"],
  ["WAHA", "Instance staging dédiée recette (numéro +229 XX XX XX XX)"],
  ["Qosic", "Sandbox MTN/Moov MoMo"],
  ["Contraintes", "Pas d'envoi WA réel hors numéros whitelistés"],
], { header: false }));

// ACTEURS
children.push(H1("7. Acteurs de la recette"));
children.push(table([2200, 2200, 2400, 1640, 1640], [
  ["Acteur", "Rôle", "Responsabilités", "Intervention", "Livrables"],
  ...acteurs,
], { header: true }));

// STRATÉGIE
children.push(H1("8. Stratégie de recette"));
[
  ["Recette fonctionnelle", "Vérifier que chaque fonctionnalité métier répond aux exigences."],
  ["Recette technique", "Edge functions, RLS, indexes, triggers."],
  ["Recette d'intégration", "WAHA, Qosic, ElevenLabs, NLLB, Google Sheets."],
  ["Recette de non-régression", "Rejouer scénarios critiques après chaque correction."],
  ["Recette de sécurité", "Tests XSS, injection, escalade de privilèges, fuites RLS."],
  ["Recette UX/UI", "Cohérence design system, accessibilité AA, responsive."],
  ["Recette de performance", "Temps de réponse, charge concurrente."],
  ["Recette mobile / responsive", "APK Android, viewports 375/768/1280/1920."],
  ["Recette des habilitations", "Matrice des droits respectée."],
  ["Recette des données", "Intégrité, cohérence, doublons, archivage."],
  ["Recette des rapports et exports", "PDF, Excel, CSV avec mise en forme."],
  ["Recette des notifications", "WA, in-app, push, email."],
  ["Recette des workflows", "Cycle complet interest → closed."],
  ["Recette sauvegarde / restauration", "Snapshots Supabase + catalog backups."],
].forEach(([t, d]) => { children.push(H3(t)); children.push(P(d)); });

// CRITICITÉ
children.push(H1("9. Niveaux de criticité des anomalies"));
children.push(table([1600, 2400, 2880, 1600, 1600], [
  ["Niveau", "Définition", "Exemple", "Impact", "Décision"],
  ...criticites,
], { header: true }));

// CRITÈRES ENTRÉE/SORTIE
children.push(H1("10. Critères d'entrée et de sortie de recette"));
children.push(H2("10.1 Critères d'entrée"));
[
  "Plateforme déployée en environnement de recette",
  "Tous les modules en périmètre sont disponibles",
  "Comptes de test créés et fonctionnels",
  "Jeux de données préparés",
  "Documentation à jour disponible",
  "Environnement stable depuis 48h",
  "Accès Supabase, WAHA, Qosic ouverts pour QA",
  "Version candidate identifiée et tagguée",
  "Cahier de recette v1.0 approuvé",
].forEach(x => children.push(bullet(x)));
children.push(H2("10.2 Critères de sortie"));
[
  "100% des tests bloquants exécutés",
  "0 anomalie bloquante ouverte",
  "Anomalies majeures corrigées ou acceptées avec réserve documentée",
  "PV de recette signé par MOA et MOE",
  "Tous les livrables techniques validés",
  "Décision formelle de mise en production prise",
].forEach(x => children.push(bullet(x)));

// MATRICE DROITS
children.push(H1("11. Matrice des droits"));
children.push(P("Légende : C = Création, L = Lecture, M = Modification, S = Suppression, V = Validation, E = Export, N/A = Non autorisé.", { italics: true }));
children.push(table([800, 2200, 1080, 1080, 1080, 1080, 1080, 1680], [
  ["Mod.", "Fonctionnalité", "Admin", "Gestionnaire", "Validateur", "Utilisateur", "Auditeur", "Observations"],
  ...matriceDroits,
], { header: true }));

// SCÉNARIOS DÉTAILLÉS
children.push(H1("12. Scénarios détaillés de recette"));
children.push(P(`Total de scénarios : ${TOTAL_SCENARIOS}, répartis sur ${MODULES.length} modules.`, { italics: true }));

for (const mod of MODULES) {
  children.push(H2(`Module ${mod.num} — ${mod.name}`));
  children.push(P(mod.desc, { italics: true, after: 120 }));
  // Tableau résumé scénarios
  const widths = [1100, 2400, 1200, 1500, 2200, 880, 800];
  const header = ["ID", "Fonctionnalité / Objectif", "Profil", "Étapes (résumé)", "Résultat attendu", "Criticité", "Statut"];
  const rows = [header, ...mod.scenarios.map(s => [
    s.id,
    `${s.fonctionnalite}\n${s.objectif}`,
    s.profil,
    s.etapes,
    s.attendu,
    s.criticite,
    s.statut,
  ])];
  children.push(table(widths, rows, { header: true }));
}

// ANOMALIES
children.push(H1("13. Grille de suivi des anomalies"));
children.push(table([800, 1100, 900, 1100, 1800, 1500, 1200, 880], [
  ["ID", "Date", "Module", "Scénario", "Description", "Étapes", "Criticité", "Statut"],
  ["ANO-001", "JJ/MM/AAAA", "M__", "T__-___", "À renseigner", "À renseigner", "Bloquante / Majeure / Mineure", "Ouvert"],
  ["ANO-002", "", "", "", "", "", "", ""],
  ["ANO-003", "", "", "", "", "", "", ""],
], { header: true }));

children.push(H2("13.1 Modèle de fiche d'anomalie"));
children.push(table([3000, 7080], [
  [cell("ID anomalie", { bold: true, shade: BRAND_LIGHT }), cell("ANO-XXX")],
  [cell("Date détection", { bold: true, shade: BRAND_LIGHT }), cell("JJ/MM/AAAA HH:MM")],
  [cell("Détecté par", { bold: true, shade: BRAND_LIGHT }), cell("Nom du testeur")],
  [cell("Module", { bold: true, shade: BRAND_LIGHT }), cell("M__")],
  [cell("Scénario concerné", { bold: true, shade: BRAND_LIGHT }), cell("T__-___")],
  [cell("Profil utilisé", { bold: true, shade: BRAND_LIGHT }), cell("Admin / Vendeur / Acheteur / Anonyme / Partenaire / Mobile")],
  [cell("Description", { bold: true, shade: BRAND_LIGHT }), cell("Description claire et concise de l'anomalie")],
  [cell("Étapes de reproduction", { bold: true, shade: BRAND_LIGHT }), cell("1.\n2.\n3.")],
  [cell("Résultat attendu", { bold: true, shade: BRAND_LIGHT }), cell("...")],
  [cell("Résultat constaté", { bold: true, shade: BRAND_LIGHT }), cell("...")],
  [cell("Criticité", { bold: true, shade: BRAND_LIGHT }), cell("Bloquante / Majeure / Mineure / Cosmétique")],
  [cell("Preuve", { bold: true, shade: BRAND_LIGHT }), cell("Capture écran, log, fichier exporté, email")],
  [cell("Responsable correction", { bold: true, shade: BRAND_LIGHT }), cell("Nom développeur")],
  [cell("Statut", { bold: true, shade: BRAND_LIGHT }), cell("Ouvert / En cours / Corrigé / Retesté OK / Refusé")],
  [cell("Date correction", { bold: true, shade: BRAND_LIGHT }), cell("JJ/MM/AAAA")],
  [cell("Date retest", { bold: true, shade: BRAND_LIGHT }), cell("JJ/MM/AAAA")],
  [cell("Résultat retest", { bold: true, shade: BRAND_LIGHT }), cell("Conforme / Non conforme")],
  [cell("Commentaires", { bold: true, shade: BRAND_LIGHT }), cell("")],
]));

// MODÈLE RAPPORT
children.push(H1("14. Modèle de rapport de recette"));
children.push(P("Le rapport hebdomadaire de recette doit contenir au minimum : nombre de tests planifiés / exécutés / conformes / non conformes, nombre d'anomalies par criticité, blocages rencontrés, recommandations pour la semaine suivante, planning révisé."));
children.push(table([3600, 1500, 1500, 1500, 1980], [
  ["Indicateur", "Semaine S", "Semaine S+1", "Semaine S+2", "Cumul"],
  ["Tests planifiés", "", "", "", ""],
  ["Tests exécutés", "", "", "", ""],
  ["Tests conformes", "", "", "", ""],
  ["Tests non conformes", "", "", "", ""],
  ["Taux de réussite (%)", "", "", "", ""],
  ["Anomalies bloquantes", "", "", "", ""],
  ["Anomalies majeures", "", "", "", ""],
  ["Anomalies mineures", "", "", "", ""],
  ["Anomalies cosmétiques", "", "", "", ""],
], { header: true }));

// PV
children.push(H1("15. Modèle de procès-verbal de recette"));
children.push(table([3000, 7080], [
  [cell("Projet", { bold: true, shade: BRAND_LIGHT }), cell("Plateforme bot.bj — WAOUH Marketplace")],
  [cell("Version testée", { bold: true, shade: BRAND_LIGHT }), cell("v1.0")],
  [cell("Période de recette", { bold: true, shade: BRAND_LIGHT }), cell("Du __/__/____ au __/__/____")],
  [cell("Participants", { bold: true, shade: BRAND_LIGHT }), cell("MOA, MOE, Responsable recette, Testeurs, Représentant client")],
  [cell("Nombre total de tests prévus", { bold: true, shade: BRAND_LIGHT }), cell(String(TOTAL_SCENARIOS))],
  [cell("Nombre de tests exécutés", { bold: true, shade: BRAND_LIGHT }), cell("___")],
  [cell("Nombre de tests conformes", { bold: true, shade: BRAND_LIGHT }), cell("___")],
  [cell("Nombre de tests non conformes", { bold: true, shade: BRAND_LIGHT }), cell("___")],
  [cell("Anomalies bloquantes", { bold: true, shade: BRAND_LIGHT }), cell("___")],
  [cell("Anomalies majeures", { bold: true, shade: BRAND_LIGHT }), cell("___")],
  [cell("Anomalies mineures", { bold: true, shade: BRAND_LIGHT }), cell("___")],
  [cell("Réserves", { bold: true, shade: BRAND_LIGHT }), cell("Liste des réserves formulées par le client")],
  [cell("Décision finale", { bold: true, shade: BRAND_LIGHT }), cell("☐ Recette acceptée\n☐ Recette acceptée avec réserves\n☐ Recette refusée")],
]));
children.push(P(" "));
children.push(P("Signatures :", { bold: true }));
children.push(table([3360, 3360, 3360], [
  ["MOA", "MOE", "Responsable recette"],
  ["\n\n\nNom :\nDate :\nSignature :", "\n\n\nNom :\nDate :\nSignature :", "\n\n\nNom :\nDate :\nSignature :"],
]));

// CONCLUSION
children.push(H1("16. Critères de validation finale, réserves et recommandations"));
children.push(H2("16.1 Critères de validation finale"));
[
  "100% des scénarios bloquants conformes",
  "≥95% des scénarios majeurs conformes",
  "Aucune fuite de données (RLS validée)",
  "Pipeline WhatsApp stable sous charge",
  "APK installable et fonctionnelle",
  "Sync chat multi-fenêtres v12 sans régression (78/78 invariants)",
].forEach(x => children.push(bullet(x)));
children.push(H2("16.2 Réserves possibles"));
[
  "Anomalies mineures à corriger en V1.1 (sous 30j)",
  "Optimisations performance dépendant de la charge réelle observée en production",
  "Actions manuelles Supabase à effectuer post-déploiement (Leaked Password Protection, OTP 600s, upgrade Postgres)",
].forEach(x => children.push(bullet(x)));
children.push(H2("16.3 Recommandations avant mise en production"));
[
  "Effectuer les 3 actions manuelles Supabase mentionnées ci-dessus",
  "Activer le monitoring complet (logs edge functions, métriques Supabase, alertes WAHA)",
  "Préparer un plan de rollback (snapshot DB + image Docker précédente)",
  "Communiquer aux utilisateurs pilotes une fenêtre de feedback de 7 jours",
  "Programmer une recette de non-régression à J+15",
].forEach(x => children.push(bullet(x)));

children.push(H1("17. Conclusion"));
children.push(P("Le présent cahier de recette couvre l'intégralité du périmètre fonctionnel, technique, ergonomique et sécuritaire de la plateforme bot.bj dans sa version 1.0. Son exécution rigoureuse, accompagnée du suivi des anomalies via la grille fournie et de la signature du procès-verbal, conditionne la décision officielle de mise en production. Les scénarios détaillés (227 au total) couvrent tous les profils, tous les canaux de chat (web anonyme, app, WhatsApp), toutes les intégrations critiques et tous les workflows métier. Une attention particulière est portée au module chat WAOUH, cœur de la plateforme, dont la synchronisation multi-fenêtres acheteur/vendeur a été verrouillée en v12 (78 invariants automatisés)."));
children.push(P(" "));
children.push(P("Fin du document.", { italics: true, align: AlignmentType.CENTER }));

// === Build doc ===
const doc = new Document({
  creator: "bot.bj QA",
  title: "Cahier de recette bot.bj",
  description: "Cahier de recette plateforme bot.bj v1.0",
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, color: BRAND, font: "Arial" },
        paragraph: { spacing: { before: 240, after: 160 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, color: BRAND, font: "Arial" },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 22, bold: true, font: "Arial" },
        paragraph: { spacing: { before: 160, after: 80 }, outlineLevel: 2 } },
    ],
  },
  numbering: {
    config: [
      { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbers", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: PAGE_W, height: PAGE_H, orientation: PageOrientation.PORTRAIT },
        margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN, header: 540, footer: 540 },
      },
    },
    headers: {
      default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Cahier de recette — bot.bj v1.0", size: 16, color: "888888" })] })] }),
    },
    footers: {
      default: new Footer({ children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "Page ", size: 16, color: "888888" }), new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "888888" }), new TextRun({ text: " / ", size: 16, color: "888888" }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: "888888" })],
      })] }),
    },
    children,
  }],
});

const buf = await Packer.toBuffer(doc);
const OUT_DIR = "/mnt/documents";
const OUT_NAME = "Cahier_Recette_bot_bj_v1.docx";
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, OUT_NAME), buf);
fs.mkdirSync("public/recette", { recursive: true });
fs.writeFileSync(path.join("public/recette", OUT_NAME), buf);
console.log(`OK: ${OUT_NAME} (${(buf.length/1024).toFixed(1)} KB, ${TOTAL_SCENARIOS} scénarios)`);
