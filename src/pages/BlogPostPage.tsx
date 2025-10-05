import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, Clock, Share2 } from 'lucide-react';
import { Breadcrumbs } from '@/components/Breadcrumbs';

export const BlogPostPage: React.FC = () => {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  
  useEffect(() => {
    document.title = 'Comment créer un chatbot WhatsApp au Bénin en 10 minutes | Blog Bot.BJ';
  }, []);

  // Schema.org Article
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": "Comment créer un chatbot WhatsApp au Bénin en 10 minutes",
    "description": "Guide complet pour créer votre premier chatbot WhatsApp intelligent avec Bot.BJ. Sans compétence technique requise.",
    "image": "https://bot.bj/og-image-botbj.jpg",
    "datePublished": "2025-01-15",
    "dateModified": "2025-01-15",
    "author": {
      "@type": "Organization",
      "name": "Bot.BJ",
      "url": "https://bot.bj"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Bot.BJ",
      "logo": {
        "@type": "ImageObject",
        "url": "https://bot.bj/favicon.ico"
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `https://bot.bj/blog/${slug}`
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      
      <div className="min-h-screen gradient-warm">
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumbs items={[
            { label: 'Blog', href: '/blog' },
            { label: 'Comment créer un chatbot WhatsApp', href: `/blog/${slug}` }
          ]} />
          
          <Button
            variant="ghost"
            onClick={() => navigate('/blog')}
            className="mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour au blog
          </Button>

          <article>
            <header className="mb-8">
              <Badge variant="secondary" className="mb-4">Guide débutant</Badge>
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                Comment créer un chatbot WhatsApp au Bénin en 10 minutes
              </h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  15 janvier 2025
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  8 min de lecture
                </span>
              </div>
              <Button variant="outline" size="sm">
                <Share2 className="mr-2 h-4 w-4" />
                Partager
              </Button>
            </header>

            <div className="prose prose-lg max-w-none mb-12">
              <p className="text-xl text-muted-foreground mb-6">
                Vous souhaitez automatiser votre support client sur WhatsApp mais vous ne savez pas par où commencer ? Ce guide vous montre comment créer votre premier chatbot WhatsApp intelligent en moins de 10 minutes avec Bot.BJ.
              </p>

              <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">
                Pourquoi créer un chatbot WhatsApp pour votre business ?
              </h2>
              <p className="text-muted-foreground mb-4">
                Avec plus de 2 milliards d'utilisateurs actifs, WhatsApp est devenu un canal incontournable pour communiquer avec vos clients au Bénin. Un chatbot intelligent vous permet de :
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-6">
                <li>Répondre instantanément 24h/24 et 7j/7 à vos clients</li>
                <li>Qualifier automatiquement vos prospects et générer plus de leads</li>
                <li>Augmenter vos conversions de +40% en moyenne</li>
                <li>Gagner jusqu'à 20h par semaine sur le support client</li>
                <li>Améliorer la satisfaction client avec des réponses personnalisées</li>
              </ul>

              <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">
                Étape 1 : Créer votre compte Bot.BJ
              </h2>
              <p className="text-muted-foreground mb-4">
                Rendez-vous sur <a href="https://bot.bj/auth" className="text-primary hover:underline">bot.bj/auth</a> et créez votre compte gratuitement. Aucune carte bancaire n'est requise pour commencer. L'inscription ne prend que 30 secondes.
              </p>

              <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">
                Étape 2 : Configurer votre premier bot
              </h2>
              <p className="text-muted-foreground mb-4">
                Une fois connecté, cliquez sur "Créer un bot" et remplissez les informations de base :
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-6">
                <li><strong>Nom du bot :</strong> Donnez un nom à votre assistant (ex: "Assistant E-commerce")</li>
                <li><strong>Contexte :</strong> Décrivez votre entreprise et vos services</li>
                <li><strong>Ton :</strong> Choisissez le style de communication (formel, amical, etc.)</li>
                <li><strong>Langue :</strong> Français, anglais ou multilingue</li>
              </ul>

              <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">
                Étape 3 : Connecter WhatsApp Business
              </h2>
              <p className="text-muted-foreground mb-4">
                Bot.BJ s'intègre parfaitement avec WhatsApp Business API. Suivez l'assistant de connexion qui vous guide pas à pas pour lier votre numéro WhatsApp Business à votre chatbot.
              </p>

              <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">
                Étape 4 : Tester votre chatbot
              </h2>
              <p className="text-muted-foreground mb-4">
                Avant de le rendre public, testez votre chatbot en envoyant des messages depuis votre téléphone. Vérifiez que les réponses sont pertinentes et ajustez le contexte si nécessaire.
              </p>

              <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">
                Étape 5 : Partager votre bot et suivre les performances
              </h2>
              <p className="text-muted-foreground mb-4">
                Votre chatbot est prêt ! Partagez le lien de votre bot sur vos réseaux sociaux, votre site web, ou via QR code. Suivez les performances en temps réel depuis votre tableau de bord : nombre de conversations, taux de satisfaction, leads qualifiés, etc.
              </p>

              <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">
                Fonctionnalités avancées
              </h2>
              <p className="text-muted-foreground mb-4">
                Une fois votre chatbot de base créé, explorez les fonctionnalités avancées de Bot.BJ :
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-6">
                <li><strong>CRM intégré :</strong> Suivez et qualifiez vos prospects automatiquement</li>
                <li><strong>Campagnes marketing :</strong> Envoyez des messages ciblés à vos contacts</li>
                <li><strong>Relances automatiques :</strong> Ne perdez plus aucun lead</li>
                <li><strong>Analytics avancés :</strong> Mesurez le ROI de votre chatbot</li>
                <li><strong>Intégrations :</strong> Connectez votre CRM, Google Sheets, etc.</li>
              </ul>

              <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">
                Conclusion
              </h2>
              <p className="text-muted-foreground mb-4">
                Créer un chatbot WhatsApp n'a jamais été aussi simple. En moins de 10 minutes, vous pouvez avoir un assistant intelligent qui travaille pour vous 24h/24. Avec Bot.BJ, automatisez votre support client, qualifiez vos leads et boostez vos conversions dès aujourd'hui.
              </p>
            </div>

            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="text-center py-8">
                <h2 className="text-2xl font-bold mb-4">Créez votre chatbot WhatsApp maintenant</h2>
                <p className="text-muted-foreground mb-6">
                  Essai gratuit sans carte bancaire • Configuration en 10 minutes • Support inclus
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
          </article>
        </div>
      </div>
    </>
  );
};
