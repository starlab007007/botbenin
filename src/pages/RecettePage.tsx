import { useEffect } from "react";
import { Download, FileText, ShieldCheck, Smartphone, MessageCircle, Bot, BarChart3, MapPin, Radar, Megaphone } from "lucide-react";

const DOCX_V2 = "/recette/Cahier_Recette_bot_bj_v2.docx";
const DOCX_V1 = "/recette/Cahier_Recette_bot_bj_v1.docx";

const summary = [
  { icon: FileText, label: "385 scénarios", desc: "30 modules couverts" },
  { icon: Bot, label: "Agents IA", desc: "Commerce RAG, BI, Stock, Présence QR" },
  { icon: MessageCircle, label: "Chat WAOUH", desc: "Cas A/B/C, sync v12 multi-fenêtres" },
  { icon: ShieldCheck, label: "Sécurité", desc: "RLS multi-tenant, XSS, audit" },
];

const sections = [
  { n: 1, t: "Historique des versions" },
  { n: 2, t: "Acronymes et définitions" },
  { n: 3, t: "Introduction (contexte, objectif, enjeux)" },
  { n: 4, t: "Périmètre (inclus / exclus / profils)" },
  { n: 5, t: "Objectifs de la recette (11 axes)" },
  { n: 6, t: "Environnement de recette (Pro Supabase, WAHA, IA gateway)" },
  { n: 7, t: "Acteurs de la recette" },
  { n: 8, t: "Stratégie de recette (14 types)" },
  { n: 9, t: "Niveaux de criticité" },
  { n: 10, t: "Critères d'entrée et de sortie" },
  { n: 11, t: "Matrice des droits étendue (7 profils)" },
  { n: 12, t: "Scénarios détaillés (385 tests sur 30 modules)" },
  { n: 13, t: "Grille de suivi + modèle fiche d'anomalie" },
  { n: 14, t: "Modèle de rapport hebdomadaire" },
  { n: 15, t: "Modèle de procès-verbal de recette" },
  { n: 16, t: "Critères de validation, réserves, recommandations" },
  { n: 17, t: "Conclusion" },
];

const modulesV1 = [
  "M1 Authentification (15)", "M2 Utilisateurs (12)", "M3 Rôles & permissions (10)",
  "M4 Tableau de bord (10)", "M5 Articles WAOUH (14)", "M6 Workflow négociation/deal (12)",
  "M7 Notifications (14)", "M8 Recherche & filtres (10)", "M9 Import données (8)",
  "M10 Export & rapports (10)", "M11 Paramétrage (8)", "M12 Journalisation & audit (8)",
  "M13 Documents & pièces jointes (8)", "M14 UI/UX & responsive (12)", "M15 Sécurité (26)",
  "M16 Performance & charge (10)", "M17 API & intégrations (20)", "M18 Sauvegarde / dispo (6)",
  "M19 Chat WAOUH (22) — A/B/C, sync v12", "M20 Mobile APK (10)", "M21 Partenaire & Admin (14)",
];

const modulesV2 = [
  "M22 Agent IA Commerce/Docs/Website RAG (18)",
  "M23 Agent BI / Analytique IA (14)",
  "M24 Agent Gestion de Stock IA (14)",
  "M25 Agent Présence QR géofencé 50m (14)",
  "M26 Radar IA WAOUH (10)",
  "M27 Diffusion IA ciblée (14)",
  "M28 Sessions WhatsApp IA (QR + pair-code) (12)",
  "M29 Contrôle Admin unifié bots/agents (16)",
  "M30 Prix Réel WAOUH & Deals admin (14)",
];

const highlights = [
  { icon: Bot, title: "Agents IA verticaux (M22-M25)", desc: "RAG produits/docs/site, BI Recharts, stock intelligent, présence QR géofencée avec Nominatim." },
  { icon: Radar, title: "Radar IA (M26)", desc: "Sonar concentrique, Urgency Mode, matching contacts proches, autosend." },
  { icon: Megaphone, title: "Diffusion IA ciblée (M27)", desc: "Audience v_diffusion_audience, ciblage 3 niveaux, validation admin obligatoire, tracking." },
  { icon: BarChart3, title: "Contrôle Admin (M29)", desc: "/admin/bots-control : onglets Bots, AI, BI, Stock, Présence, WA + start/stop WAHA + admin_logs." },
];

export default function RecettePage() {
  useEffect(() => {
    document.title = "Cahier de recette v2 — bot.bj";
  }, []);
  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <header className="mb-8">
          <p className="text-sm text-emerald-700 font-semibold tracking-wide uppercase">Document officiel — v2.0</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-emerald-900 mt-2">Cahier de recette — Plateforme bot.bj</h1>
          <p className="text-muted-foreground mt-3 max-w-3xl">
            Référence officielle de la phase de recette fonctionnelle, technique, ergonomique et sécuritaire
            préalable à la mise en production. Cette version 2.0 intègre l'ensemble des nouveaux modules IA
            (Commerce RAG, BI, Stock, Présence QR), le Radar, la Diffusion ciblée, les sessions WhatsApp
            (QR + code d'appairage), le contrôle admin unifié et le module Prix Réel WAOUH.
          </p>

          <div className="flex flex-wrap gap-3 mt-6">
            <a
              href={DOCX_V2}
              download
              className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2.5 rounded-lg font-medium shadow-sm transition"
            >
              <Download className="w-4 h-4" />
              Télécharger le .docx v2 (385 scénarios)
            </a>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 border border-emerald-700 text-emerald-700 hover:bg-emerald-50 px-5 py-2.5 rounded-lg font-medium transition"
            >
              Imprimer / Export PDF
            </button>
            <a
              href={DOCX_V1}
              download
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-emerald-800 px-3 py-2 transition"
            >
              Voir version v1.0 (237 scénarios)
            </a>
          </div>
        </header>

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
          {summary.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="bg-white border border-emerald-100 rounded-lg p-4 shadow-sm">
              <Icon className="w-5 h-5 text-emerald-700 mb-2" />
              <div className="font-semibold text-emerald-900">{label}</div>
              <div className="text-xs text-muted-foreground mt-1">{desc}</div>
            </div>
          ))}
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-bold text-emerald-900 mb-3">Nouveautés v2.0</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {highlights.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white border border-emerald-100 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-4 h-4 text-emerald-700" />
                  <div className="font-semibold text-emerald-900">{title}</div>
                </div>
                <div className="text-sm text-muted-foreground">{desc}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-bold text-emerald-900 mb-3">Sommaire</h2>
          <ol className="bg-white border rounded-lg divide-y">
            {sections.map(s => (
              <li key={s.n} className="px-4 py-2.5 flex items-baseline gap-3">
                <span className="text-emerald-700 font-semibold tabular-nums w-6">{s.n}.</span>
                <span className="text-sm sm:text-base">{s.t}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-bold text-emerald-900 mb-3">Modules couverts (385 scénarios)</h2>
          <h3 className="text-sm font-semibold text-emerald-800 mb-2">Socle historique (v1)</h3>
          <ul className="grid sm:grid-cols-2 gap-2 mb-5">
            {modulesV1.map(m => (
              <li key={m} className="bg-white border rounded-md px-3 py-2 text-sm">{m}</li>
            ))}
          </ul>
          <h3 className="text-sm font-semibold text-emerald-800 mb-2">Nouveaux modules IA (v2)</h3>
          <ul className="grid sm:grid-cols-2 gap-2">
            {modulesV2.map(m => (
              <li key={m} className="bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2 text-sm font-medium text-emerald-900">{m}</li>
            ))}
          </ul>
        </section>

        <section className="mb-10 bg-emerald-50 border border-emerald-200 rounded-lg p-5">
          <h2 className="text-xl font-bold text-emerald-900 mb-2 flex items-center gap-2">
            <MessageCircle className="w-5 h-5" /> Focus chat WAOUH (M19)
          </h2>
          <p className="text-sm text-emerald-900/80">
            22 scénarios couvrent les cas A (acheteur web), B (vendeur reçoit intent), C (chat croisé temps réel),
            les 4 combinaisons App/WA vendeur×acheteur, la multi-fenêtres <code>WaouhMatchChatWindow</code>,
            le filtre realtime <code>counterpart_user_id</code>, le filtre strict <code>matchesAnyKeyword</code>
            (Zara/Mixa), la déduplication notify-dispatch, le sentinel runtime et les 78 invariants v12.
          </p>
        </section>

        <section className="mb-10 bg-indigo-50 border border-indigo-200 rounded-lg p-5">
          <h2 className="text-xl font-bold text-indigo-900 mb-2 flex items-center gap-2">
            <Bot className="w-5 h-5" /> Focus Agents IA (M22 → M25)
          </h2>
          <p className="text-sm text-indigo-900/80">
            60 scénarios validant les agents IA verticaux : ingestion RAG (produits partenaires, PDF/DOCX, crawl web),
            embeddings pgvector, human takeover WhatsApp, BI multi-source (Google Sheets / CSV / XLSX) avec Recharts,
            gestion de stock intelligente (seuils, alertes WA, requêtes IA), présence QR géofencée 50 m avec
            Nominatim et régénération admin.
          </p>
        </section>

        <section className="mb-10 bg-amber-50 border border-amber-200 rounded-lg p-5">
          <h2 className="text-xl font-bold text-amber-900 mb-2 flex items-center gap-2">
            <Smartphone className="w-5 h-5" /> Actions manuelles Supabase avant production
          </h2>
          <ul className="text-sm text-amber-900/90 list-disc pl-5 space-y-1">
            <li>Activer <strong>Leaked Password Protection</strong> dans Auth</li>
            <li>Réduire l'<strong>OTP expiry</strong> à 600 s</li>
            <li>Effectuer la <strong>mise à jour Postgres</strong> recommandée</li>
            <li>Vérifier les <strong>quotas Realtime</strong> et backups <strong>PITR</strong> (Pro)</li>
            <li>Auditer <strong>admin_logs</strong> et confirmer la purge quotidienne</li>
          </ul>
        </section>

        <footer className="text-xs text-muted-foreground border-t pt-4 mt-10">
          Document généré le 15 juillet 2026 — v2.0 — bot.bj QA. Remplace la v1.0 (12/06/2026).
        </footer>
      </div>
    </main>
  );
}
