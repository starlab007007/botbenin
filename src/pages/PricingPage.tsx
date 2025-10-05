import React, { useEffect } from 'react';
import { PricingSection } from '@/components/home/PricingSection';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export const PricingPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Tarifs Bot.BJ - Plans Chatbot WhatsApp IA dès 15 000 XOF/mois';
  }, []);

  return (
    <>

      <div className="min-h-screen gradient-warm">
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              Tarifs transparents pour votre croissance
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Choisissez le plan adapté à votre business. Essai gratuit sans carte bancaire.
            </p>
          </header>

          <PricingSection />

          <section className="mt-16 text-center">
            <h2 className="text-2xl font-bold mb-4">Questions sur nos tarifs ?</h2>
            <p className="text-muted-foreground mb-6">
              Notre équipe est là pour vous aider à choisir le meilleur plan.
            </p>
            <Button size="lg" onClick={() => navigate('/home')}>
              Discuter avec notre équipe
            </Button>
          </section>
        </div>
      </div>
    </>
  );
};
