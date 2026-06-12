import { useEffect } from "react";
import { Download, FileText, ShieldCheck, Smartphone, MessageCircle } from "lucide-react";

const DOCX_URL = "/recette/Cahier_Recette_bot_bj_v1.docx";

const summary = [
  { icon: FileText, label: "237 scénarios", desc: "21 modules couverts" },
  { icon: MessageCircle, label: "Chat WAOUH", desc: "Scénarios A/B/C, sync v12 multi-fenêtres" },
  { icon: Smartphone, label: "APK mobile", desc: "ChatScreen, push, offline" },
  { icon: ShieldCheck, label: "Sécurité", desc: "RLS, XSS, escalade, fuites PII" },
];

const sections = [
  { n: 1, t: "Historique des versions" },
  { n: 2, t: "Acronymes et définitions" },
  { n: 3, t: "Introduction (contexte, objectif, enjeux)" },
  { n: 4, t: "Périmètre (inclus / exclus / profils)" },
  { n: 5, t: "Objectifs de la recette (11 axes)" },
  { n: 6, t: "Environnement de recette" },
  { n: 7, t: "Acteurs de la recette" },
  { n: 8, t: "Stratégie de recette (14 types)" },
  { n: 9, t: "Niveaux de criticité" },
  { n: 10, t: "Critères d'entrée et de sortie" },
  { n: 11, t: "Matrice des droits" },
  { n: 12, t: "Scénarios détaillés (237 tests sur 21 modules)" },
  { n: 13, t: "Grille de suivi + modèle fiche d'anomalie" },
  { n: 14, t: "Modèle de rapport hebdomadaire" },
  { n: 15, t: "Modèle de procès-verbal de recette" },
  { n: 16, t: "Critères de validation finale, réserves, recommandations" },
  { n: 17, t: "Conclusion" },
];

const modules = [
  "M1 Authentification (15)", "M2 Utilisateurs (12)", "M3 Rôles & permissions (10)",
  "M4 Tableau de bord (10)", "M5 Articles WAOUH (14)", "M6 Workflows négociation/deal (12)",
  "M7 Notifications (14)", "M8 Recherche & filtres (10)", "M9 Import données (8)",
  "M10 Export & rapports (10)", "M11 Paramétrage (8)", "M12 Journalisation & audit (8)",
  "M13 Documents & pièces jointes (8)", "M14 UI/UX & responsive (12)", "M15 Sécurité (18)",
  "M16 Performance & charge (10)", "M17 API & intégrations (14)", "M18 Sauvegarde / dispo (6)",
  "M19 Chat WAOUH dédié (18) — A/B/C, sync v12", "M20 Mobile APK (10)", "M21 Partenaire & Admin (10)",
];

export default function RecettePage() {
  useEffect(() => {
    document.title = "Cahier de recette — bot.bj";
  }, []);
  return (
    <>
      <main className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
          <header className="mb-8">
            <p className="text-sm text-emerald-700 font-semibold tracking-wide uppercase">Document officiel — v1.0</p>
            <h1 className="text-3xl sm:text-4xl font-bold text-emerald-900 mt-2">Cahier de recette — Plateforme bot.bj</h1>
            <p className="text-muted-foreground mt-3 max-w-3xl">
              Référence officielle pour la phase de recette fonctionnelle, technique, ergonomique et sécuritaire
              préalable à la mise en production. Couvre tous les profils (anonyme, mobile, acheteur/vendeur WAOUH,
              partenaire, admin) et tous les canaux du module chat (web, app, WhatsApp).
            </p>

            <div className="flex flex-wrap gap-3 mt-6">
              <a
                href={DOCX_URL}
                download
                className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2.5 rounded-lg font-medium shadow-sm transition"
              >
                <Download className="w-4 h-4" />
                Télécharger le .docx (237 scénarios)
              </a>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 border border-emerald-700 text-emerald-700 hover:bg-emerald-50 px-5 py-2.5 rounded-lg font-medium transition"
              >
                Imprimer / Export PDF
              </button>
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
            <h2 className="text-xl font-bold text-emerald-900 mb-3">Modules couverts (237 scénarios)</h2>
            <ul className="grid sm:grid-cols-2 gap-2">
              {modules.map(m => (
                <li key={m} className="bg-white border rounded-md px-3 py-2 text-sm">{m}</li>
              ))}
            </ul>
          </section>

          <section className="mb-10 bg-emerald-50 border border-emerald-200 rounded-lg p-5">
            <h2 className="text-xl font-bold text-emerald-900 mb-2">Focus chat WAOUH (M19)</h2>
            <p className="text-sm text-emerald-900/80">
              18 scénarios dédiés couvrent les cas A (acheteur seul web), B (vendeur reçoit intent), C (chat croisé
              acheteur/vendeur temps réel), la multi-fenêtres <code>WaouhMatchChatWindow</code> par (article, acheteur),
              le filtre realtime <code>counterpart_user_id</code>, la déduplication notify-dispatch, le sentinel runtime
              et les 78 invariants automatisés du lock v12.
            </p>
          </section>

          <section className="mb-10 bg-amber-50 border border-amber-200 rounded-lg p-5">
            <h2 className="text-xl font-bold text-amber-900 mb-2">Actions manuelles Supabase avant mise en production</h2>
            <ul className="text-sm text-amber-900/90 list-disc pl-5 space-y-1">
              <li>Activer <strong>Leaked Password Protection</strong> dans Auth</li>
              <li>Réduire l'<strong>OTP expiry</strong> à 600 s</li>
              <li>Effectuer la <strong>mise à jour Postgres</strong> recommandée</li>
            </ul>
          </section>

          <footer className="text-xs text-muted-foreground border-t pt-4 mt-10">
            Document généré le 12 juin 2026 — v1.0 — bot.bj QA.
          </footer>
        </div>
      </main>
    </>
  );
}
