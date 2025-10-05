import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Star, Quote } from 'lucide-react';
import { Breadcrumbs } from '@/components/Breadcrumbs';

interface Testimonial {
  name: string;
  role: string;
  company: string;
  rating: number;
  comment: string;
  useCase: string;
  date: string;
}

export const TestimonialsPage: React.FC = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    document.title = 'Témoignages Clients Bot.BJ - Avis Chatbot WhatsApp IA Bénin';
  }, []);

  const testimonials: Testimonial[] = [
    {
      name: "Marie Akplogan",
      role: "Directrice Marketing",
      company: "E-Shop Bénin",
      rating: 5,
      comment: "Bot.BJ a transformé notre service client. Nous répondons maintenant à nos clients 24h/24 sur WhatsApp et nos conversions ont augmenté de 45% en 2 mois. L'investissement en vaut vraiment la peine !",
      useCase: "E-commerce",
      date: "2025-01-10"
    },
    {
      name: "Koffi Mensah",
      role: "CEO",
      company: "TechStart Cotonou",
      rating: 5,
      comment: "Incroyable ! En tant que startup, nous n'avions pas les moyens d'embaucher une équipe support. Avec Bot.BJ, notre chatbot gère 80% des demandes automatiquement. Nous avons gagné 15h par semaine.",
      useCase: "Startup Tech",
      date: "2025-01-08"
    },
    {
      name: "Sandra Kossou",
      role: "Responsable Service Client",
      company: "BeninAssur",
      rating: 5,
      comment: "La qualification automatique des leads est extraordinaire. Notre équipe commerciale ne perd plus de temps avec des prospects non qualifiés. Le ROI est positif dès le premier mois.",
      useCase: "Assurance",
      date: "2025-01-05"
    },
    {
      name: "Arnaud Dossou",
      role: "Gérant",
      company: "Restaurant Le Palais",
      rating: 4,
      comment: "Nous utilisons Bot.BJ pour gérer nos réservations sur WhatsApp. Les clients adorent la réactivité et nous avons réduit de 70% les erreurs de réservation. Simple et efficace !",
      useCase: "Restauration",
      date: "2025-01-03"
    },
    {
      name: "Fatoumata Diallo",
      role: "Directrice",
      company: "Beauty Store BJ",
      rating: 5,
      comment: "Nos clientes posent souvent les mêmes questions sur nos produits. Avec Bot.BJ, elles obtiennent des réponses instantanées même la nuit. Notre taux de satisfaction client est passé de 75% à 92% !",
      useCase: "Cosmétiques",
      date: "2025-01-01"
    },
    {
      name: "Jean-Claude Agbodjan",
      role: "Responsable Commercial",
      company: "Immobilier Plus",
      rating: 5,
      comment: "Le CRM intégré est génial. Tous nos prospects WhatsApp sont automatiquement enregistrés et qualifiés. Nous suivons facilement notre pipeline et les relances sont automatiques. Je recommande à 100% !",
      useCase: "Immobilier",
      date: "2024-12-28"
    }
  ];

  // Schema.org Review pour chaque témoignage
  const reviewsSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": "Bot.BJ",
    "description": "Plateforme de création de chatbots WhatsApp intelligents avec IA",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "reviewCount": testimonials.length,
      "bestRating": "5",
      "worstRating": "1"
    },
    "review": testimonials.map(t => ({
      "@type": "Review",
      "author": {
        "@type": "Person",
        "name": t.name
      },
      "datePublished": t.date,
      "reviewBody": t.comment,
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": t.rating,
        "bestRating": "5",
        "worstRating": "1"
      }
    }))
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewsSchema) }}
      />
      
      <div className="min-h-screen gradient-warm">
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumbs items={[{ label: 'Témoignages', href: '/testimonials' }]} />
          
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
              Témoignages Clients - Avis Bot.BJ Chatbot WhatsApp
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Découvrez comment +1000 entreprises béninoises automatisent leur business avec Bot.BJ
            </p>
            <div className="flex items-center justify-center gap-2 mt-4">
              <div className="flex">
                {[1,2,3,4,5].map(i => (
                  <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <span className="text-muted-foreground">4.8/5 • {testimonials.length} avis</span>
            </div>
          </header>

          {/* Testimonials Grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="hover:shadow-lg transition-all duration-300 relative">
                <CardContent className="pt-6">
                  <Quote className="h-8 w-8 text-primary/20 mb-4" />
                  <div className="flex mb-2">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-foreground mb-4 italic">{testimonial.comment}</p>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <div>
                      <p className="font-semibold text-foreground">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.role}, {testimonial.company}</p>
                    </div>
                    <Badge variant="secondary">{testimonial.useCase}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Stats Section */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <Card>
              <CardContent className="text-center py-8">
                <div className="text-4xl font-bold text-primary mb-2">+1000</div>
                <p className="text-muted-foreground">Entreprises clientes</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="text-center py-8">
                <div className="text-4xl font-bold text-primary mb-2">+40%</div>
                <p className="text-muted-foreground">Conversions en moyenne</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="text-center py-8">
                <div className="text-4xl font-bold text-primary mb-2">20h</div>
                <p className="text-muted-foreground">Économisées par semaine</p>
              </CardContent>
            </Card>
          </div>

          {/* CTA Section */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="text-center py-8">
              <h2 className="text-2xl font-bold mb-4">Rejoignez-les et transformez votre business</h2>
              <p className="text-muted-foreground mb-6">
                Créez votre chatbot WhatsApp en 10 minutes • Essai gratuit sans carte bancaire
              </p>
              <div className="flex gap-4 justify-center flex-wrap">
                <Button size="lg" onClick={() => navigate('/auth')}>
                  Démarrer gratuitement
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigate('/pricing')}>
                  Voir les tarifs
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};
