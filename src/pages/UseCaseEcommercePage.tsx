import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Check, ShoppingCart, MessageCircle, TrendingUp } from 'lucide-react';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { trackCTAClick } from '@/components/GoogleAnalytics';

export const UseCaseEcommercePage: React.FC = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    document.title = 'Chatbot WhatsApp E-commerce - Automatisez vos Ventes en Ligne | Bot.BJ';
  }, []);

  const benefits = [
    "Réponses instantanées 24/7 sur disponibilité produits",
    "Recommandations personnalisées basées sur l'IA",
    "Suivi automatique des commandes par WhatsApp",
    "Relances panier abandonné (+35% récupération)",
    "Gestion des retours et réclamations automatisée",
    "Programmes de fidélité et promotions ciblées"
  ];

  const stats = [
    { label: "Augmentation des ventes", value: "+45%", icon: TrendingUp },
    { label: "Taux de conversion", value: "+40%", icon: ShoppingCart },
    { label: "Satisfaction client", value: "92%", icon: MessageCircle }
  ];

  return (
    <>
      <div className="min-h-screen gradient-warm">
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumbs items={[
            { label: 'Use Cases', href: '/use-cases' },
            { label: 'E-commerce', href: '/use-case/ecommerce' }
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
              Chatbot WhatsApp pour E-commerce au Bénin
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Automatisez vos ventes en ligne, augmentez vos conversions de +40% et offrez un service client 24/7 avec Bot.BJ
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
                <p className="text-muted-foreground">• Clients attendent des heures pour une réponse</p>
                <p className="text-muted-foreground">• Paniers abandonnés non relancés</p>
                <p className="text-muted-foreground">• Questions répétitives prennent du temps</p>
                <p className="text-muted-foreground">• Impossible de gérer le volume la nuit</p>
                <p className="text-muted-foreground">• Perte de ventes par manque de disponibilité</p>
              </CardContent>
            </Card>

            <Card className="border-primary/50 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-primary">✅ Avec Bot.BJ</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-foreground">• Réponses instantanées 24h/24, 7j/7</p>
                <p className="text-foreground">• Relances automatiques panier abandonné</p>
                <p className="text-foreground">• IA répond aux questions courantes</p>
                <p className="text-foreground">• Gestion illimitée de conversations</p>
                <p className="text-foreground">• +40% de conversions en moyenne</p>
              </CardContent>
            </Card>
          </div>

          {/* Features */}
          <Card className="mb-12">
            <CardHeader>
              <CardTitle className="text-2xl">Fonctionnalités clés pour e-commerce</CardTitle>
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
              <h3 className="font-semibold text-lg mb-3">E-Shop Bénin - Boutique de mode en ligne</h3>
              <p className="text-muted-foreground mb-4">
                <strong className="text-foreground">Problème :</strong> E-Shop recevait 200+ messages WhatsApp par jour avec des questions sur les tailles, disponibilités et livraisons. L'équipe était débordée et perdait des ventes.
              </p>
              <p className="text-muted-foreground mb-4">
                <strong className="text-foreground">Solution Bot.BJ :</strong> Mise en place d'un chatbot intelligent qui répond automatiquement aux questions fréquentes, qualifie les prospects et relance les paniers abandonnés.
              </p>
              <p className="text-muted-foreground">
                <strong className="text-foreground">Résultats :</strong> +45% de conversions, 80% des questions gérées automatiquement, 15h économisées par semaine, satisfaction client passée de 75% à 92%.
              </p>
            </CardContent>
          </Card>

          {/* CTA Section */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="text-center py-12">
              <ShoppingCart className="h-16 w-16 text-primary mx-auto mb-6" />
              <h2 className="text-3xl font-bold mb-4">Prêt à booster vos ventes e-commerce ?</h2>
              <p className="text-muted-foreground mb-8 text-lg max-w-2xl mx-auto">
                Créez votre chatbot WhatsApp pour e-commerce en 10 minutes. Essai gratuit sans carte bancaire.
              </p>
              <div className="flex gap-4 justify-center flex-wrap">
                <Button 
                  size="lg" 
                  onClick={() => {
                    trackCTAClick('Démarrer gratuitement', 'E-commerce Use Case');
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
