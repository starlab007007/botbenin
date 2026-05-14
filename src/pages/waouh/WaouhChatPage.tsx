import React from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ShoppingBag, Search, Handshake, CreditCard, ArrowLeft, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import WaouhWebChat from "@/components/waouh/WaouhWebChat";
import { useAuth } from "@/contexts/AuthContext";

const QUICK_ACTIONS = [
  { icon: ShoppingBag, title: "Vendre", desc: "Publiez un article en 30s", gradient: "from-emerald-500 to-teal-500" },
  { icon: Search, title: "Acheter", desc: "Trouvez près de vous", gradient: "from-cyan-500 to-blue-500" },
  { icon: Handshake, title: "Négocier", desc: "Proposez votre prix", gradient: "from-amber-500 to-orange-500" },
  { icon: CreditCard, title: "Payer", desc: "Mobile Money sécurisé", gradient: "from-purple-500 to-pink-500" },
];

const EXAMPLES = [
  '"Je vends mon iPhone 14 Pro 256Go à Cotonou — 650 000 FCFA"',
  '"Je cherche un frigo d\'occasion à Calavi, max 150 000 FCFA"',
  '"Je propose 580 000 FCFA pour l\'iPhone"',
  '"Je paye en Mobile Money MTN, mon numéro 97 12 34 56"',
];

export default function WaouhChatPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50/30 to-blue-50/40">
      <Helmet>
        <title>WAOUH Chat — Achetez, Vendez, Négociez, Payez | bot.bj</title>
        <meta name="description" content="Marketplace IA géolocalisée du Bénin. Vendez, achetez, négociez et payez en Mobile Money directement depuis le chat." />
      </Helmet>

      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-md group-hover:scale-105 transition">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-gray-900 leading-tight">WAOUH</h1>
              <p className="text-xs text-gray-500">Marketplace IA — bot.bj</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hidden sm:inline-flex">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
              IA en ligne
            </Badge>
            {user ? (
              <Link to="/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-1.5" /> Plateforme
                </Button>
              </Link>
            ) : (
              <Link to="/auth">
                <Button size="sm" className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:opacity-90">
                  Se connecter
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Hero */}
        <section className="text-center mb-6 lg:mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-gray-200 shadow-sm text-xs text-gray-600 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
            Propulsé par l'IA — Cotonou & tout le Bénin
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 leading-tight">
            Achetez · Vendez · Négociez · <span className="bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent">Payez</span>
          </h2>
          <p className="text-sm sm:text-base text-gray-600 mt-2 max-w-2xl mx-auto">
            Discutez simplement avec WAOUH en français, Fon ou Yoruba. Tout se passe dans le chat.
          </p>
        </section>

        {/* Quick actions */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {QUICK_ACTIONS.map((a) => (
            <Card key={a.title} className="p-4 bg-white border-gray-200 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-default">
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${a.gradient} flex items-center justify-center shadow-sm mb-2`}>
                <a.icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 text-sm">{a.title}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{a.desc}</p>
            </Card>
          ))}
        </section>

        {/* Chat + side help */}
        <section className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <Card className="overflow-hidden border-gray-200 shadow-xl">
              <WaouhWebChat embedded />
            </Card>
          </div>

          <aside className="space-y-4">
            <Card className="p-4 bg-white border-gray-200">
              <h3 className="font-semibold text-gray-900 text-sm mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-500" /> Exemples de phrases
              </h3>
              <ul className="space-y-2">
                {EXAMPLES.map((e) => (
                  <li key={e} className="text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-lg p-2">
                    {e}
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-4 bg-gradient-to-br from-cyan-500 to-blue-600 text-white border-0">
              <h3 className="font-semibold text-sm mb-1">100% sécurisé</h3>
              <p className="text-xs text-white/90 leading-relaxed">
                Paiements Mobile Money via escrow. L'argent n'est libéré au vendeur qu'après confirmation de la transaction.
              </p>
            </Card>

            <Card className="p-4 bg-white border-gray-200">
              <h3 className="font-semibold text-gray-900 text-sm mb-2">Aussi sur WhatsApp</h3>
              <p className="text-xs text-gray-600">Envoyez "WAOUH" au numéro de votre revendeur local pour discuter directement depuis WhatsApp.</p>
            </Card>
          </aside>
        </section>
      </main>

      <footer className="text-center py-6 text-xs text-gray-500">
        WAOUH — World AI Open Universal Hub · Une initiative <Link to="/" className="text-cyan-600 hover:underline">bot.bj</Link>
      </footer>
    </div>
  );
}
