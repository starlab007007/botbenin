import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, TrendingUp, DollarSign, Award } from 'lucide-react';

interface Innovation {
  id: string;
  icon: string;
  title: string;
  tagline: string;
  problem: string;
  solution: string;
  features: string[];
  impact: {
    metric: string;
    value: string;
  }[];
  pricing: string;
  roi: string;
  badge?: string;
}

const innovations: Innovation[] = [
  {
    id: 'visual-creator',
    icon: '🎨',
    title: 'IA Créateur Visuel',
    tagline: 'La Première IA Créative Africaine',
    problem: 'Les entreprises africaines paient des graphistes chers (50 000 - 200 000 FCFA/mois) pour créer des visuels pour les réseaux sociaux.',
    solution: 'IA Créateur Visuel génère des images professionnelles en 30 secondes',
    features: [
      '🎯 4 formats sociaux (Instagram, Facebook, TikTok, Stories)',
      '🎨 6 styles visuels (Moderne, Élégant, Coloré, etc.)',
      '⚡ Création illimitée (pack Pro)',
      '💾 Galerie personnelle automatique',
      '📱 Export haute résolution',
      '🔄 Modification instantanée'
    ],
    impact: [
      { metric: 'Réduction des coûts design', value: '80%' },
      { metric: 'Plus rapide qu\'un graphiste', value: '10x' },
      { metric: 'Créations par mois (Pro)', value: 'Illimité' },
      { metric: 'Tests A/B', value: 'Instantanés' }
    ],
    pricing: 'À partir de 5 000 FCFA/mois (vs 50 000 FCFA pour un graphiste)',
    roi: '45 000 FCFA économisés/mois = 540 000 FCFA/an',
    badge: '⭐ Innovation #1'
  },
  {
    id: 'precall-report',
    icon: '📊',
    title: 'IA Prospect Rapport Pre-Call',
    tagline: 'La Révolution B2B : Préparez Vos Rendez-vous en 2 Minutes',
    problem: 'Les commerciaux passent 2-3 heures à rechercher des informations sur leurs prospects avant chaque rendez-vous (LinkedIn, site web, Google).',
    solution: 'IA Rapport Pre-Call génère un dossier complet en 2 minutes',
    features: [
      '🔍 Enrichissement automatique depuis LinkedIn, web, réseaux sociaux',
      '📄 Rapport PDF structuré avec photo, poste, entreprise, actualités',
      '🎯 Points de discussion personnalisés',
      '💡 Stratégie d\'approche recommandée',
      '📊 Détection d\'opportunités (projets, besoins, timing)',
      '⏱️ Gain de temps massif'
    ],
    impact: [
      { metric: 'Temps gagné', value: '95%' },
      { metric: 'Taux de conversion', value: '+40%' },
      { metric: 'Temps de préparation', value: '2 min vs 2-3h' },
      { metric: 'Professionnalisme perçu', value: '+60%' }
    ],
    pricing: 'Inclus dans pack Professionnel (5 000 FCFA/mois)',
    roi: '1 seule vente supplémentaire rembourse l\'abonnement annuel',
    badge: '🚀 USP Unique'
  },
  {
    id: 'whatsapp-ai',
    icon: '💬',
    title: 'WhatsApp IA Intelligent',
    tagline: 'Le Premier Bot WhatsApp 100% Africain',
    problem: 'WhatsApp est le canal #1 en Afrique mais impossible à automatiser avec les solutions classiques (complexes, chères, pas adaptées).',
    solution: 'WhatsApp Connect transforme votre WhatsApp Business en machine de vente',
    features: [
      '⚡ Connexion en 1 clic (QR Code)',
      '🤖 Réponses automatiques 24/7 contextuelles',
      '📊 Analytics détaillées des conversations',
      '📱 Campagnes ciblées par segments',
      '🔗 Intégration CRM automatique',
      '✅ Conformité WhatsApp Business API'
    ],
    impact: [
      { metric: 'Taux d\'ouverture', value: '95%' },
      { metric: 'Plus de conversions', value: '3x' },
      { metric: 'Disponibilité', value: '24/7' },
      { metric: 'Messages non lus', value: '0' }
    ],
    pricing: 'À partir de 3 000 FCFA/mois (vs 50 000 FCFA pour un agent)',
    roi: '47 000 FCFA économisés/mois = 564 000 FCFA/an',
    badge: '📱 WhatsApp First'
  },
  {
    id: 'knowledge-bases',
    icon: '📚',
    title: 'Bases de Connaissances Sectorielles',
    tagline: '8 Secteurs Pré-Configurés Pour Démarrer en 10 Minutes',
    problem: 'Former un chatbot de zéro prend des semaines et nécessite des compétences techniques.',
    solution: 'Templates intelligents par secteur déjà remplis',
    features: [
      '✅ 50-100 questions/réponses types du secteur',
      '✅ Workflows automatisés préconfigurés',
      '✅ Personnalité adaptée au métier',
      '✅ Import Excel/CSV/PDF de vos données',
      '🏨 Hôtellerie | 🛒 E-commerce | 🎓 Formation',
      '🏘️ Immobilier | 💼 B2B | 🎨 Marketing | 🏛️ Public | 🤝 ONG'
    ],
    impact: [
      { metric: 'Déploiement', value: '10 min vs 2-4 semaines' },
      { metric: 'Précision dès le départ', value: '95%' },
      { metric: 'Personnalisation', value: 'Facile' },
      { metric: 'Formation continue', value: 'Automatique' }
    ],
    pricing: 'Inclus dans tous les packs (gratuit dans Découverte)',
    roi: 'Économie de 200 000 - 500 000 FCFA en formation/configuration',
    badge: '⚡ Démarrage Express'
  }
];

export const InnovationShowcase = () => {
  return (
    <div className="space-y-12">
      <div className="text-center space-y-4">
        <Badge variant="secondary" className="text-lg px-4 py-2">
          <Sparkles className="w-4 h-4 mr-2 inline" />
          Innovations Exclusives
        </Badge>
        <h2 className="text-3xl md:text-4xl font-bold text-foreground">
          🔥 Pourquoi Bot.bj Est Unique ?
        </h2>
        <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
          Des technologies révolutionnaires développées spécifiquement pour le marché africain
        </p>
      </div>

      <div className="space-y-12">
        {innovations.map((innovation, index) => (
          <Card key={innovation.id} className={`p-8 space-y-6 ${index % 2 === 0 ? 'bg-gradient-to-br from-primary/5 to-accent/5' : 'bg-gradient-to-bl from-accent/5 to-primary/5'}`}>
            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-4">
                <div className="text-5xl">{innovation.icon}</div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-bold text-foreground">{innovation.title}</h3>
                  <p className="text-lg text-primary font-semibold">{innovation.tagline}</p>
                </div>
              </div>
              {innovation.badge && (
                <Badge variant="default" className="text-sm px-3 py-1">
                  {innovation.badge}
                </Badge>
              )}
            </div>

            {/* Problem */}
            <Card className="p-4 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900">
              <p className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2">😓 Le Problème :</p>
              <p className="text-foreground">{innovation.problem}</p>
            </Card>

            {/* Solution */}
            <Card className="p-4 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
              <p className="text-sm font-semibold text-green-600 dark:text-green-400 mb-2">💡 Notre Solution :</p>
              <p className="text-foreground font-medium">{innovation.solution}</p>
            </Card>

            {/* Features */}
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground">Fonctionnalités :</h4>
              <div className="grid sm:grid-cols-2 gap-2">
                {innovation.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-primary">✓</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{feature}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Impact */}
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Impact Mesuré :
              </h4>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {innovation.impact.map((item, idx) => (
                  <Card key={idx} className="p-4 bg-background">
                    <p className="text-xs text-muted-foreground mb-1">{item.metric}</p>
                    <p className="text-2xl font-bold text-primary">{item.value}</p>
                  </Card>
                ))}
              </div>
            </div>

            {/* Pricing & ROI */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
                <div className="flex items-start gap-2 mb-2">
                  <DollarSign className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">Tarif :</p>
                    <p className="text-foreground">{innovation.pricing}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
                <div className="flex items-start gap-2 mb-2">
                  <Award className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-green-600 dark:text-green-400">ROI :</p>
                    <p className="text-foreground font-semibold">{innovation.roi}</p>
                  </div>
                </div>
              </Card>
            </div>

            <div className="flex justify-center pt-4">
              <Button size="lg" className="px-8">
                Découvrir {innovation.title}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
