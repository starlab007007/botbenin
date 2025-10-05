import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Check, Headphones, Clock, Users } from 'lucide-react';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { trackCTAClick } from '@/components/GoogleAnalytics';

export const UseCaseSupportPage: React.FC = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    document.title = 'Chatbot WhatsApp Support Client - Automatisation Service Client 24/7 | Bot.BJ';
  }, []);

  const benefits = [
    "Support client disponible 24h/24, 7j/7",
    "Réduction de 70% du temps de réponse",
    "Gestion illimitée de conversations simultanées",
    "Base de connaissances IA intelligente",
    "Routage automatique vers agents humains si besoin",
    "Historique complet des conversations clients"
  ];

  const stats = [
    { label: "Réduction temps support", value: "-70%", icon: Clock },
    { label: "Disponibilité", value: "24/7", icon: Headphones },
    { label: "Satisfaction client", value: "+25%", icon: Users }
  ];

  return (
    <>
      <div className="min-h-screen gradient-warm">
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumbs items={[
            { label: 'Use Cases', href: '/use-cases' },
            { label: 'Support Client', href: '/use-case/support' }
          ]} />
          
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à l'accueil
          </Button>

          <header className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
              Chatbot WhatsApp Support Client au Bénin
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Automatisez votre support client 24/7, réduisez vos coûts de 60% et améliorez la satisfaction client avec Bot.BJ
            </p>
          </header>

          {/* Stats Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Card key={index}>
                  <CardContent className="text-center py-8">
                    <Icon className="h-12 w-12 text-primary mx-auto mb-4" />
                    <div className="text-4xl font-bold text-primary mb-2">{stat.value}</div>
                    <p className="text-muted-foreground">{stat.label}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Problem / Solution */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="text-destructive">❌ Sans Bot.BJ</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-muted-foreground">• Support uniquement aux heures de bureau</p>
                <p className="text-muted-foreground">• Clients frustrés par l'attente</p>
                <p className="text-muted-foreground">• Équipe débordée par questions répétitives</p>
                <p className="text-muted-foreground">• Coûts élevés pour maintenir une équipe</p>
                <p className="text-muted-foreground">• Perte de clients par manque de réactivité</p>
              </CardContent>
            </Card>

            <Card className="border-primary/50 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-primary">✅ Avec Bot.BJ</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-foreground">• Support disponible 24h/24, 7j/7</p>
                <p className="text-foreground">• Réponses instantanées automatiques</p>
                <p className="text-foreground">• 80% des questions résolues par l'IA</p>
                <p className="text-foreground">• Réduction de 60% des coûts support</p>
                <p className="text-foreground">• +25% de satisfaction client</p>
              </CardContent>
            </Card>
          </div>

          {/* Features */}
          <Card className="mb-12">
            <CardHeader>
              <CardTitle className="text-2xl">Fonctionnalités clés pour support client</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-1" />
                    <span className="text-foreground">{benefit}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Use Case Example */}
          <Card className="mb-12">
            <CardHeader>
              <CardTitle className="text-2xl">Cas d'usage concret</CardTitle>
            </CardHeader>
            <CardContent>
              <h3 className="font-semibold text-lg mb-3">BeninAssur - Compagnie d'assurance</h3>
              <p className="text-muted-foreground mb-4">
                <strong className="text-foreground">Problème :</strong> BeninAssur recevait 500+ demandes support par jour. L'équipe de 5 agents était débordée et les clients attendaient jusqu'à 4h pour une réponse simple.
              </p>
              <p className="text-muted-foreground mb-4">
                <strong className="text-foreground">Solution Bot.BJ :</strong> Chatbot intelligent qui répond aux questions fréquentes (tarifs, couvertures, sinistres) et route les cas complexes vers agents humains avec contexte complet.
              </p>
              <p className="text-muted-foreground">
                <strong className="text-foreground">Résultats :</strong> 80% des demandes traitées automatiquement, temps de réponse réduit à 2 minutes, satisfaction client +30%, économie de 3 agents équivalents temps plein.
              </p>
            </CardContent>
          </Card>

          {/* CTA Section */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="text-center py-12">
              <Headphones className="h-16 w-16 text-primary mx-auto mb-6" />
              <h2 className="text-3xl font-bold mb-4">Révolutionnez votre support client</h2>
              <p className="text-muted-foreground mb-8 text-lg max-w-2xl mx-auto">
                Créez votre chatbot WhatsApp pour support client en 10 minutes. Disponible 24/7 dès aujourd'hui.
              </p>
              <div className="flex gap-4 justify-center flex-wrap">
                <Button 
                  size="lg" 
                  onClick={() => {
                    trackCTAClick('Démarrer gratuitement', 'Support Use Case');
                    navigate('/auth');
                  }}
                >
                  Démarrer gratuitement
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  onClick={() => navigate('/pricing')}
                >
                  Voir les tarifs
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  onClick={() => navigate('/testimonials')}
                >
                  Lire les témoignages
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};
