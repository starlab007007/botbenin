import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { Breadcrumbs } from '@/components/Breadcrumbs';

export const FAQPage: React.FC = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    document.title = 'FAQ Bot.BJ - Questions fréquentes sur notre Chatbot WhatsApp IA';
  }, []);

  const faqs = [
    {
      question: "Comment fonctionne Bot.BJ ?",
      answer: "Bot.BJ vous permet de créer un chatbot WhatsApp intelligent en quelques minutes. Notre IA analyse vos conversations, qualifie vos leads automatiquement et répond 24/7 à vos clients. Aucune compétence technique requise. Il suffit de vous inscrire, configurer votre bot avec vos informations, et le connecter à votre compte WhatsApp Business."
    },
    {
      question: "Combien coûte Bot.BJ ?",
      answer: "Bot.BJ propose un essai gratuit sans carte bancaire pour tester toutes les fonctionnalités. Nos plans payants démarrent à partir de 15 000 XOF/mois (plan Starter) avec des fonctionnalités avancées d'automatisation et d'analyse. Le plan Pro est à 35 000 XOF/mois, et nous proposons également des solutions Entreprise personnalisées."
    },
    {
      question: "Bot.BJ est-il compatible avec WhatsApp Business ?",
      answer: "Oui, Bot.BJ s'intègre parfaitement avec WhatsApp Business et WhatsApp Business API. Vous pouvez automatiser vos réponses, gérer plusieurs conversations simultanément, utiliser des templates de messages, et accéder à des analyses détaillées de vos conversations."
    },
    {
      question: "Puis-je essayer Bot.BJ gratuitement ?",
      answer: "Absolument ! Bot.BJ offre un essai gratuit complet sans demander de carte bancaire. Testez toutes les fonctionnalités premium pendant la période d'essai et créez votre premier chatbot en quelques minutes. Aucun engagement, aucun frais caché."
    },
    {
      question: "Quelle est la différence entre les plans Starter, Pro et Entreprise ?",
      answer: "Le plan Starter (15 000 XOF/mois) offre 1 bot, 1000 messages/mois et les fonctionnalités de base. Le plan Pro (35 000 XOF/mois) inclut 3 bots, 5000 messages/mois, le CRM intégré et les campagnes marketing. Le plan Entreprise offre des bots illimités, messages illimités, support prioritaire et personnalisation avancée."
    },
    {
      question: "Mes données sont-elles sécurisées avec Bot.BJ ?",
      answer: "La sécurité est notre priorité. Toutes vos données sont chiffrées et stockées de manière sécurisée. Nous sommes conformes aux normes de protection des données et n'utilisons jamais vos informations à des fins commerciales. Vos conversations restent 100% privées."
    },
    {
      question: "Puis-je personnaliser les réponses de mon chatbot ?",
      answer: "Oui, totalement ! Vous pouvez configurer le contexte de votre bot, définir son ton, personnaliser ses réponses selon votre secteur d'activité, et même créer des scénarios de conversation spécifiques. L'IA s'adapte à votre style et à vos besoins."
    },
    {
      question: "Bot.BJ supporte-t-il plusieurs langues ?",
      answer: "Oui, notre IA supporte le français, l'anglais et peut comprendre plusieurs dialectes locaux béninois. Vous pouvez configurer votre bot pour répondre dans la langue de votre choix ou même en mode multilingue pour s'adapter automatiquement à vos clients."
    },
    {
      question: "Comment annuler mon abonnement ?",
      answer: "Vous pouvez annuler votre abonnement à tout moment depuis votre tableau de bord, sans frais ni pénalités. Votre accès reste actif jusqu'à la fin de votre période de facturation en cours. Aucune question posée, aucune complication."
    },
    {
      question: "Proposez-vous un support client ?",
      answer: "Oui ! Tous nos plans incluent un support par chat et email. Le plan Pro bénéficie d'un support prioritaire, et le plan Entreprise inclut un gestionnaire de compte dédié et un support téléphonique 24/7."
    },
    {
      question: "Puis-je intégrer Bot.BJ avec d'autres outils ?",
      answer: "Oui, Bot.BJ propose des intégrations avec les principaux outils CRM, outils de marketing, et plateformes de paiement. Vous pouvez également utiliser notre API pour créer des intégrations personnalisées selon vos besoins spécifiques."
    },
    {
      question: "Combien de temps faut-il pour configurer mon chatbot ?",
      answer: "Vous pouvez avoir votre premier chatbot opérationnel en moins de 10 minutes ! Notre interface intuitive vous guide pas à pas. Aucune compétence technique n'est requise. Il suffit de remplir quelques informations sur votre business et de connecter votre WhatsApp."
    }
  ];

  return (
    <>

      <div className="min-h-screen gradient-warm">
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumbs items={[{ label: 'FAQ', href: '/faq' }]} />
          
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
              FAQ Bot.BJ - Questions Chatbot WhatsApp IA Bénin
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Tout ce que vous devez savoir sur notre chatbot WhatsApp intelligent et l'automatisation de votre business
            </p>
          </header>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Questions & Réponses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger className="text-left">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="text-center py-8">
              <h2 className="text-2xl font-bold mb-4">Vous ne trouvez pas votre réponse ?</h2>
              <p className="text-muted-foreground mb-6">
                Notre équipe est disponible pour répondre à toutes vos questions sur notre chatbot WhatsApp
              </p>
              <div className="flex gap-4 justify-center flex-wrap">
                <Button size="lg" onClick={() => navigate('/home')}>
                  Discuter avec notre IA
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigate('/whatsapp-connect')}>
                  Démarrer sur WhatsApp
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigate('/pricing')}>
                  Voir les Tarifs
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};
