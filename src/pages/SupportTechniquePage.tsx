import React, { useState } from 'react';
import { Helmet } from '@/components/SEO';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LifeBuoy, Bot, Ticket, BookOpen, Shield, Zap, ArrowRight, Activity, Users, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SupportChatbot } from '@/components/support/SupportChatbot';
import { TicketForm } from '@/components/support/TicketForm';
import { useAuth } from '@/contexts/AuthContext';

const SupportTechniquePage: React.FC = () => {
  const { user } = useAuth();
  const [ticketOpen, setTicketOpen] = useState(false);
  const [prefilledDescription, setPrefilledDescription] = useState<string | undefined>(undefined);

  const handleEscalate = (conversation: { role: string; content: string }[]) => {
    const summary = conversation
      .map((m) => `${m.role === 'user' ? 'Utilisateur' : 'Assistant N1'} : ${m.content}`)
      .join('\n\n');
    setPrefilledDescription(`Escalade depuis le chatbot N1 — Conversation :\n\n${summary}`);
    setTicketOpen(true);
  };

  return (
    <>
      <Helmet>
        <title>Support Technique SIGDSTS — Réponse immédiate 24/7 | Bot.bj</title>
        <meta name="description" content="Support technique de la plateforme SIGDSTS : chatbot IA niveau 1, gestion des tickets, suivi des incidents en temps réel. Disponible 24/7." />
        <link rel="canonical" href="https://bot.bj/sigdsts" />
      </Helmet>

      <div className="container mx-auto px-4 py-6 lg:py-10 max-w-7xl">
        {/* Hero */}
        <div className="mb-8 lg:mb-10">
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300">
              <Activity className="w-3 h-3 mr-1" /> Service opérationnel
            </Badge>
            <Badge variant="outline">SIGDSTS v11.0</Badge>
          </div>
          <h1 className="text-3xl lg:text-5xl font-bold tracking-tight mb-3 bg-gradient-to-r from-emerald-700 to-blue-700 bg-clip-text text-transparent">
            Support Technique SIGDSTS
          </h1>
          <p className="text-base lg:text-lg text-muted-foreground max-w-3xl">
            Réponse immédiate via notre assistant IA niveau 1 basé sur le Guide officiel,
            ou ouverture de ticket vers le support N2 humain avec SLA garanti.
          </p>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <ActionCard
            icon={Bot}
            color="from-emerald-500 to-emerald-700"
            title="Chatbot N1 — IA"
            description="Réponse immédiate basée sur le Guide SIGDSTS"
            badge="24/7 · Gratuit"
            onClick={() => document.getElementById('chatbot-zone')?.scrollIntoView({ behavior: 'smooth' })}
            cta="Discuter maintenant"
          />
          <ActionCard
            icon={Ticket}
            color="from-blue-500 to-blue-700"
            title="Ouvrir un ticket N2"
            description="Support humain avec SLA garanti selon sévérité"
            badge="Critique 2h · Majeure 4h · Mineure 24h"
            onClick={() => { setPrefilledDescription(undefined); setTicketOpen(true); }}
            cta="Créer un ticket"
            requireAuth
            authed={!!user}
          />
          <ActionCard
            icon={BookOpen}
            color="from-purple-500 to-purple-700"
            title="Mes tickets"
            description="Suivez l'état de vos demandes en temps réel"
            badge="Historique complet"
            href="/sigdsts/tickets"
            cta="Voir mes tickets"
            requireAuth
            authed={!!user}
          />
        </div>

        {/* Chatbot + circuit info */}
        <div id="chatbot-zone" className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10 scroll-mt-20">
          <div className="lg:col-span-2">
            <SupportChatbot onEscalate={handleEscalate} />
          </div>
          <div className="space-y-4">
            <Card className="p-5">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" /> Circuit de gestion des incidents
              </h3>
              <ol className="space-y-3 text-sm">
                <CircuitStep n={1} title="Niveau 1 — Chatbot IA" desc="Résolution immédiate via l'assistant basé sur le Guide. 70% des cas." color="bg-emerald-100 text-emerald-800" />
                <CircuitStep n={2} title="Niveau 2 — Support humain" desc="Star Lab + Points Focaux ANTS. SLA garanti selon sévérité." color="bg-blue-100 text-blue-800" />
                <CircuitStep n={3} title="Niveau 3 — Escalade éditeur" desc="Bug logiciel ou évolution. Correctif et déploiement." color="bg-purple-100 text-purple-800" />
              </ol>
            </Card>

            <Card className="p-5 bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-emerald-950/20 dark:to-blue-950/20 border-emerald-200">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-600" /> SLA garantis
              </h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><span className="w-2 h-2 bg-red-500 rounded-full" />Critique</span>
                  <Badge variant="outline" className="font-mono">≤ 2h</Badge>
                </li>
                <li className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><span className="w-2 h-2 bg-orange-500 rounded-full" />Majeure</span>
                  <Badge variant="outline" className="font-mono">≤ 4h</Badge>
                </li>
                <li className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><span className="w-2 h-2 bg-blue-500 rounded-full" />Mineure</span>
                  <Badge variant="outline" className="font-mono">≤ 24h</Badge>
                </li>
              </ul>
            </Card>
          </div>
        </div>

        {/* Common categories */}
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Catégories d'incidents les plus fréquentes</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {[
              { label: 'Connexion / 2FA', icon: Shield },
              { label: 'Module Donneur', icon: Users },
              { label: 'Sélection Médicale', icon: CheckCircle2 },
              { label: 'Prélèvement', icon: AlertCircle },
              { label: 'Préparation PSL', icon: AlertCircle },
              { label: 'Qualification Biologique', icon: AlertCircle },
              { label: 'Distribution PSL', icon: AlertCircle },
              { label: 'Administration', icon: Shield },
            ].map((c) => (
              <button
                key={c.label}
                onClick={() => {
                  setPrefilledDescription(`Catégorie : ${c.label}\n\nDécrivez votre problème :`);
                  setTicketOpen(true);
                }}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent transition-colors text-left text-sm"
              >
                <c.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="truncate">{c.label}</span>
              </button>
            ))}
          </div>
        </Card>

        <TicketForm open={ticketOpen} onOpenChange={setTicketOpen} prefilledDescription={prefilledDescription} />
      </div>
    </>
  );
};

const ActionCard: React.FC<{
  icon: React.ElementType; color: string; title: string; description: string;
  badge?: string; cta: string; onClick?: () => void; href?: string;
  requireAuth?: boolean; authed?: boolean;
}> = ({ icon: Icon, color, title, description, badge, cta, onClick, href, requireAuth, authed }) => {
  const disabled = requireAuth && !authed;
  const Content = (
    <Card className={`p-5 h-full hover:shadow-lg transition-all group cursor-pointer ${disabled ? 'opacity-60' : ''}`}>
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-3 shadow-md`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground mb-2">{description}</p>
      {badge && <Badge variant="outline" className="text-xs mb-3">{badge}</Badge>}
      <div className="flex items-center text-sm font-medium text-primary group-hover:gap-3 gap-2 transition-all">
        {disabled ? 'Connexion requise' : cta} <ArrowRight className="w-4 h-4" />
      </div>
    </Card>
  );

  if (disabled) {
    return <Link to="/auth">{Content}</Link>;
  }
  if (href) return <Link to={href}>{Content}</Link>;
  return <button onClick={onClick} className="text-left w-full">{Content}</button>;
};

const CircuitStep: React.FC<{ n: number; title: string; desc: string; color: string }> = ({ n, title, desc, color }) => (
  <li className="flex gap-3">
    <div className={`shrink-0 w-7 h-7 rounded-full ${color} font-bold flex items-center justify-center text-xs`}>{n}</div>
    <div>
      <p className="font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">{desc}</p>
    </div>
  </li>
);

export default SupportTechniquePage;
