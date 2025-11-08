import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Download, 
  FileText, 
  TrendingUp, 
  Users, 
  Zap, 
  Shield,
  CheckCircle2,
  ArrowRight,
  Star
} from 'lucide-react';

interface MarketingSectionProps {
  onExportPDF: () => void;
  isExporting: boolean;
  selectedModulesCount: number;
  totalModulesCount: number;
}

export const MarketingSection: React.FC<MarketingSectionProps> = ({
  onExportPDF,
  isExporting,
  selectedModulesCount,
  totalModulesCount
}) => {
  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="text-center space-y-6 py-12">
        <div className="inline-block px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-semibold mb-4">
          🚀 La Plateforme IA N°1 en Afrique de l'Ouest
        </div>
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Transformez Votre Business avec l'IA
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          {selectedModulesCount} modules puissants pour automatiser votre support client, 
          booster vos ventes, et faire croître votre entreprise 10x plus vite.
        </p>
      </section>

      {/* Key Stats */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <Card className="p-6 text-center space-y-2 hover:shadow-lg transition-shadow">
          <div className="text-4xl font-bold text-primary">500+</div>
          <div className="text-sm text-muted-foreground">Entreprises Actives</div>
        </Card>
        <Card className="p-6 text-center space-y-2 hover:shadow-lg transition-shadow">
          <div className="text-4xl font-bold text-primary">50K+</div>
          <div className="text-sm text-muted-foreground">Messages Traités/Jour</div>
        </Card>
        <Card className="p-6 text-center space-y-2 hover:shadow-lg transition-shadow">
          <div className="text-4xl font-bold text-primary">98%</div>
          <div className="text-sm text-muted-foreground">Satisfaction Client</div>
        </Card>
        <Card className="p-6 text-center space-y-2 hover:shadow-lg transition-shadow">
          <div className="text-4xl font-bold text-primary">-70%</div>
          <div className="text-sm text-muted-foreground">Coûts Opérationnels</div>
        </Card>
      </section>

      {/* Why Bot.bj */}
      <section className="space-y-8">
        <h2 className="text-3xl font-bold text-center">Pourquoi Bot.bj ?</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-6 space-y-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Déploiement Ultra-Rapide</h3>
            <p className="text-muted-foreground">
              Lancez votre premier bot en 10 minutes. Pas de code, pas de complexité technique.
              Interface intuitive conçue pour les entrepreneurs africains.
            </p>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                <span>Configuration guidée pas-à-pas</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                <span>Templates prêts à l&apos;emploi</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                <span>Support en français et langues locales</span>
              </li>
            </ul>
          </Card>

          <Card className="p-6 space-y-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">ROI Prouvé & Mesurable</h3>
            <p className="text-muted-foreground">
              Nos clients voient un retour sur investissement en moins de 30 jours.
              Augmentation moyenne du CA de +120% la première année.
            </p>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                <span>Économies de 70% vs équipe humaine</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                <span>Taux de conversion +150%</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                <span>Dashboard analytics en temps réel</span>
              </li>
            </ul>
          </Card>

          <Card className="p-6 space-y-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Sécurité & Conformité</h3>
            <p className="text-muted-foreground">
              Vos données et celles de vos clients sont protégées avec les standards
              les plus élevés. Conformité RGPD garantie.
            </p>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                <span>Chiffrement end-to-end</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                <span>Hébergement sécurisé</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                <span>Backup automatique quotidien</span>
              </li>
            </ul>
          </Card>

          <Card className="p-6 space-y-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Support Local Expert</h3>
            <p className="text-muted-foreground">
              Une équipe basée en Afrique qui comprend votre marché et vos défis.
              Support réactif en français et langues locales.
            </p>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                <span>Chat support 24/7</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                <span>Formation et onboarding inclus</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                <span>Communauté d&apos;entrepreneurs</span>
              </li>
            </ul>
          </Card>
        </div>
      </section>

      {/* Testimonials */}
      <section className="space-y-8">
        <h2 className="text-3xl font-bold text-center">Ils Ont Transformé Leur Business</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-primary text-primary" />
              ))}
            </div>
            <p className="text-muted-foreground italic">
              &quot;Bot.bj a multiplié nos ventes WhatsApp par 3 en 2 mois. Le bot gère 80% 
              des questions, mon équipe se concentre sur les grosses ventes. ROI incroyable !&quot;
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold">
                YB
              </div>
              <div>
                <div className="font-semibold">Yasmine B.</div>
                <div className="text-sm text-muted-foreground">BéninMode, E-commerce</div>
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-primary text-primary" />
              ))}
            </div>
            <p className="text-muted-foreground italic">
              &quot;Avant Bot.bj, je perdais 50% de mes leads immobiliers. Maintenant, le bot 
              qualifie automatiquement, je ne contacte que les chauds. Taux de closing +180% !&quot;
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold">
                IT
              </div>
              <div>
                <div className="font-semibold">Ibrahim T.</div>
                <div className="text-sm text-muted-foreground">Immo Plus, Immobilier</div>
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-primary text-primary" />
              ))}
            </div>
            <p className="text-muted-foreground italic">
              &quot;Le module IA Prospect m&apos;a fait gagner 2h par prospect. Mes commerciaux 
              arrivent ultra-préparés en RDV. Notre taux de conversion a doublé !&quot;
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold">
                FL
              </div>
              <div>
                <div className="font-semibold">Franck L.</div>
                <div className="text-sm text-muted-foreground">SaaS Solutions, B2B</div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="space-y-8">
        <h2 className="text-3xl font-bold text-center">Bot.bj vs Solutions Traditionnelles</h2>
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-4 font-semibold">Critère</th>
                  <th className="text-center p-4 font-semibold">Sans Bot.bj</th>
                  <th className="text-center p-4 font-semibold bg-primary/10">
                    <div className="flex items-center justify-center gap-2">
                      <span>Avec Bot.bj</span>
                      <Star className="w-4 h-4 fill-primary text-primary" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="p-4 font-medium">Disponibilité</td>
                  <td className="p-4 text-center text-muted-foreground">8h/jour (horaires bureau)</td>
                  <td className="p-4 text-center bg-primary/5 font-semibold text-primary">24/7 non-stop</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium">Temps de réponse</td>
                  <td className="p-4 text-center text-muted-foreground">2-6 heures</td>
                  <td className="p-4 text-center bg-primary/5 font-semibold text-primary">&lt;1 minute</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium">Coût mensuel</td>
                  <td className="p-4 text-center text-muted-foreground">100 000+ FCFA (agents)</td>
                  <td className="p-4 text-center bg-primary/5 font-semibold text-primary">Dès 0 FCFA</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium">Taux de conversion</td>
                  <td className="p-4 text-center text-muted-foreground">5-10%</td>
                  <td className="p-4 text-center bg-primary/5 font-semibold text-primary">15-25%</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium">Scalabilité</td>
                  <td className="p-4 text-center text-muted-foreground">Limitée (embauche)</td>
                  <td className="p-4 text-center bg-primary/5 font-semibold text-primary">Infinie</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium">Analytics & Insights</td>
                  <td className="p-4 text-center text-muted-foreground">Basique ou manuel</td>
                  <td className="p-4 text-center bg-primary/5 font-semibold text-primary">Complet & temps réel</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium">Temps de déploiement</td>
                  <td className="p-4 text-center text-muted-foreground">2-4 semaines</td>
                  <td className="p-4 text-center bg-primary/5 font-semibold text-primary">10 minutes</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      {/* Download Section */}
      <section className="space-y-8 py-12 border-t">
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold">Téléchargez Votre Documentation Complète</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Obtenez le guide complet de {selectedModulesCount} modules sélectionnés en PDF professionnel 
            de 150+ pages, prêt à partager avec votre équipe.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
          <Card className="p-6 space-y-4 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-2">Guide PDF Complet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Documentation exhaustive avec workflows, guides pas-à-pas, FAQ
              </p>
              <Button 
                onClick={onExportPDF} 
                disabled={isExporting}
                className="w-full gap-2"
              >
                <Download className="w-4 h-4" />
                {isExporting ? 'Génération...' : 'Télécharger PDF'}
              </Button>
            </div>
          </Card>

          <Card className="p-6 space-y-4 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-2">Calculateur ROI</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Estimez vos économies et gains avec Bot.bj en 2 minutes
              </p>
              <Button variant="outline" className="w-full gap-2">
                <Download className="w-4 h-4" />
                Télécharger Excel
              </Button>
            </div>
          </Card>

          <Card className="p-6 space-y-4 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-2">Cas Clients</h3>
              <p className="text-sm text-muted-foreground mb-4">
                20+ études de cas détaillées avec métriques réelles
              </p>
              <Button variant="outline" className="w-full gap-2">
                <Download className="w-4 h-4" />
                Télécharger PDF
              </Button>
            </div>
          </Card>

          <Card className="p-6 space-y-4 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-2">Présentation Commerciale</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Deck PowerPoint prêt pour présenter à votre direction
              </p>
              <Button variant="outline" className="w-full gap-2">
                <Download className="w-4 h-4" />
                Télécharger PPTX
              </Button>
            </div>
          </Card>
        </div>

        <div className="text-center">
          <Button size="lg" variant="outline" className="gap-2">
            <Download className="w-5 h-5" />
            Télécharger Tout (Pack Complet ZIP)
          </Button>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-2xl p-12 text-center space-y-6">
        <h2 className="text-3xl md:text-4xl font-bold">
          Prêt à Transformer Votre Business ?
        </h2>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Rejoignez les 500+ entreprises qui ont déjà automatisé leur croissance avec Bot.bj
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
          <Button size="lg" className="gap-2 px-8">
            Essayer Gratuitement 14 Jours
            <ArrowRight className="w-5 h-5" />
          </Button>
          <Button size="lg" variant="outline" className="gap-2">
            Parler à un Expert
          </Button>
        </div>

        <div className="flex flex-wrap justify-center gap-6 pt-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            <span>Sans carte bancaire</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            <span>Annulation à tout moment</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            <span>Support en français</span>
          </div>
        </div>
      </section>

      {/* Footer Info */}
      <section className="text-center space-y-4 py-8 border-t">
        <div className="flex flex-wrap justify-center gap-8 text-sm text-muted-foreground">
          <div>
            <div className="font-semibold text-foreground">Contact</div>
            <div>contact@bot.bj</div>
          </div>
          <div>
            <div className="font-semibold text-foreground">Téléphone</div>
            <div>+229 XX XX XX XX</div>
          </div>
          <div>
            <div className="font-semibold text-foreground">Adresse</div>
            <div>Cotonou, Bénin</div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          © 2024 Bot.bj. Tous droits réservés. Made with ❤️ in Africa.
        </p>
      </section>
    </div>
  );
};
