import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowRight, Calendar, Phone, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const CTASection: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section className="py-20 bg-gradient-to-br from-primary via-primary/90 to-secondary text-primary-foreground">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center space-y-8">
          <h2 className="text-3xl md:text-5xl font-bold">
            Prêt à Automatiser votre Business ?
          </h2>
          <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto">
            Rejoignez des centaines d'entreprises africaines qui font confiance à Bot.bj
          </p>

          {/* CTAs */}
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto pt-8">
            <Card className="p-6 space-y-4 hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="w-12 h-12 rounded-lg bg-primary text-primary-foreground flex items-center justify-center mx-auto">
                <ArrowRight className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg">Commencer Gratuitement</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  Essai 14 jours
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  Sans carte bancaire
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  Support inclus
                </li>
              </ul>
              <Button 
                className="w-full" 
                size="lg"
                onClick={() => navigate('/register')}
              >
                Créer mon compte
              </Button>
            </Card>

            <Card className="p-6 space-y-4 hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="w-12 h-12 rounded-lg bg-secondary text-secondary-foreground flex items-center justify-center mx-auto">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg">Demander une Démo</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  Présentation personnalisée
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  Questions-réponses
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  Audit gratuit
                </li>
              </ul>
              <Button 
                className="w-full" 
                size="lg"
                variant="outline"
              >
                Réserver une démo
              </Button>
            </Card>

            <Card className="p-6 space-y-4 hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="w-12 h-12 rounded-lg bg-accent text-accent-foreground flex items-center justify-center mx-auto">
                <Phone className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg">Contacter les Ventes</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  Pour entreprises
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  Offres sur-mesure
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  Devis personnalisé
                </li>
              </ul>
              <Button 
                className="w-full" 
                size="lg"
                variant="outline"
              >
                Nous contacter
              </Button>
            </Card>
          </div>

          {/* Guarantees */}
          <div className="flex flex-wrap justify-center gap-6 pt-8 text-sm opacity-90">
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5" />
              <span>Pas de carte bancaire requise</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5" />
              <span>Annulation à tout moment</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5" />
              <span>Support gratuit</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5" />
              <span>Données sécurisées</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
