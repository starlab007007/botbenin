import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Users, Clock, DollarSign } from 'lucide-react';

interface CaseStudy {
  id: string;
  sector: string;
  company: string;
  location: string;
  pack: string;
  duration: string;
  icon: string;
  before: {
    metric1: { label: string; value: string };
    metric2: { label: string; value: string };
    metric3: { label: string; value: string };
    metric4: { label: string; value: string };
  };
  implementation: string[];
  results: {
    metric1: { label: string; before: string; after: string; change: string };
    metric2: { label: string; before: string; after: string; change: string };
    metric3: { label: string; before: string; after: string; change: string };
    metric4: { label: string; before: string; after: string; change: string };
  };
  roi: {
    investment: string;
    gain: string;
    percentage: string;
  };
  testimonial: {
    quote: string;
    author: string;
    role: string;
  };
}

const caseStudies: CaseStudy[] = [
  {
    id: 'hotel',
    sector: 'Hôtellerie & Tourisme',
    company: 'Hôtel Le Palmier',
    location: 'Cotonou, Bénin',
    pack: 'Professionnel (5 000 FCFA/mois)',
    duration: '6 mois',
    icon: '🏨',
    before: {
      metric1: { label: 'Taux d\'occupation', value: '65%' },
      metric2: { label: 'Demandes non traitées', value: '40%' },
      metric3: { label: 'Temps de réponse', value: '8h' },
      metric4: { label: 'Coût personnel', value: '90 000 FCFA/mois' }
    },
    implementation: [
      'Bot WhatsApp pour réservations 24/7',
      'Intégration calendrier disponibilités',
      'Réponses automatiques FAQ',
      'Confirmation/rappel automatiques'
    ],
    results: {
      metric1: { label: 'Taux d\'occupation', before: '65%', after: '82%', change: '+17 points' },
      metric2: { label: 'Demandes traitées', before: '60%', after: '100%', change: '+40 points' },
      metric3: { label: 'Temps de réponse', before: '8h', after: '<1 min', change: '-99%' },
      metric4: { label: 'CA supplémentaire', before: '0', after: '+1 200 000 FCFA/mois', change: '+1.2M' }
    },
    roi: {
      investment: '30 000 FCFA',
      gain: '7 200 000 FCFA',
      percentage: '24000%'
    },
    testimonial: {
      quote: 'Bot.bj a transformé notre business. Nous ne perdons plus aucune réservation et nos clients adorent la rapidité des réponses. Le retour sur investissement est incroyable !',
      author: 'Marie Kouassi',
      role: 'Directrice Hôtel Le Palmier'
    }
  },
  {
    id: 'ecommerce',
    sector: 'E-commerce & Retail',
    company: 'AfriMode',
    location: 'Abidjan, Côte d\'Ivoire',
    pack: 'Ventes (15 000 FCFA/mois)',
    duration: '4 mois',
    icon: '🛒',
    before: {
      metric1: { label: 'Commandes/jour', value: '15' },
      metric2: { label: 'Taux d\'abandon panier', value: '75%' },
      metric3: { label: 'Support client', value: '2 agents' },
      metric4: { label: 'Coûts marketing', value: '150 000 FCFA/mois' }
    },
    implementation: [
      'Bot catalogue produits intelligent',
      'Relances automatiques paniers abandonnés',
      'Confirmation de commandes WhatsApp',
      'Visuels marketing IA (50+/mois)'
    ],
    results: {
      metric1: { label: 'Commandes/jour', before: '15', after: '42', change: '+180%' },
      metric2: { label: 'Taux d\'abandon', before: '75%', after: '45%', change: '-30 points' },
      metric3: { label: 'Support', before: '2 agents', after: '1 agent + Bot', change: '-50%' },
      metric4: { label: 'CA mensuel', before: '2M FCFA', after: '4.8M FCFA', change: '+140%' }
    },
    roi: {
      investment: '60 000 FCFA',
      gain: '2 800 000 FCFA',
      percentage: '4667%'
    },
    testimonial: {
      quote: 'Le bot gère 80% de nos demandes et l\'IA Créateur Visuel nous a permis d\'économiser 120 000 FCFA/mois en design. On a multiplié nos ventes par 2.4 !',
      author: 'Amadou Diallo',
      role: 'Fondateur AfriMode'
    }
  },
  {
    id: 'formation',
    sector: 'Formation & Éducation',
    company: 'Excellence Academy',
    location: 'Lomé, Togo',
    pack: 'Professionnel (5 000 FCFA/mois)',
    duration: '5 mois',
    icon: '🎓',
    before: {
      metric1: { label: 'Inscriptions/mois', value: '25' },
      metric2: { label: 'Taux de réponse', value: '60%' },
      metric3: { label: 'Temps admin', value: '30h/semaine' },
      metric4: { label: 'Satisfaction', value: '70%' }
    },
    implementation: [
      'Bot orientation des étudiants',
      'Inscription automatisée en ligne',
      'Rappels automatiques cours',
      'FAQ interactive programmes'
    ],
    results: {
      metric1: { label: 'Inscriptions/mois', before: '25', after: '62', change: '+148%' },
      metric2: { label: 'Taux de réponse', before: '60%', after: '100%', change: '+40 points' },
      metric3: { label: 'Temps admin', before: '30h/sem', after: '8h/sem', change: '-73%' },
      metric4: { label: 'Satisfaction', before: '70%', after: '94%', change: '+24 points' }
    },
    roi: {
      investment: '25 000 FCFA',
      gain: '3 700 000 FCFA',
      percentage: '14700%'
    },
    testimonial: {
      quote: 'Bot.bj a automatisé toute notre gestion administrative. Nous avons triplé nos inscriptions sans embaucher et les étudiants sont ravis de la réactivité.',
      author: 'Fatou Mensah',
      role: 'Directrice Excellence Academy'
    }
  }
];

export const CaseStudies = () => {
  return (
    <div className="space-y-12">
      <div className="text-center space-y-4">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground">
          📊 Études de Cas Réelles
        </h2>
        <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
          Découvrez comment des entreprises comme la vôtre ont transformé leur business avec Bot.bj
        </p>
      </div>

      <div className="space-y-16">
        {caseStudies.map((study) => (
          <Card key={study.id} className="p-8 space-y-8">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{study.icon}</span>
                  <div>
                    <h3 className="text-2xl font-bold text-foreground">{study.company}</h3>
                    <p className="text-muted-foreground">{study.location}</p>
                  </div>
                </div>
                <Badge variant="secondary">{study.sector}</Badge>
              </div>
              <div className="text-right space-y-1">
                <p className="text-sm text-muted-foreground">Pack utilisé</p>
                <p className="font-semibold text-foreground">{study.pack}</p>
                <p className="text-xs text-muted-foreground">Durée: {study.duration}</p>
              </div>
            </div>

            {/* Before */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-foreground flex items-center gap-2">
                📉 Situation avant Bot.bj
              </h4>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.values(study.before).map((metric, idx) => (
                  <Card key={idx} className="p-4 bg-muted/30">
                    <p className="text-sm text-muted-foreground mb-1">{metric.label}</p>
                    <p className="text-xl font-bold text-foreground">{metric.value}</p>
                  </Card>
                ))}
              </div>
            </div>

            {/* Implementation */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-foreground flex items-center gap-2">
                ⚙️ Mise en place
              </h4>
              <div className="grid sm:grid-cols-2 gap-3">
                {study.implementation.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-primary">{idx + 1}</span>
                    </div>
                    <p className="text-muted-foreground">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Results */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-foreground flex items-center gap-2">
                📈 Résultats après {study.duration}
              </h4>
              <div className="grid sm:grid-cols-2 gap-4">
                {Object.values(study.results).map((metric, idx) => (
                  <Card key={idx} className="p-4 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-sm font-medium text-foreground">{metric.label}</p>
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm text-muted-foreground line-through">{metric.before}</span>
                      <span className="text-xl font-bold text-foreground">{metric.after}</span>
                    </div>
                    <p className="text-sm font-semibold text-green-600 mt-1">{metric.change}</p>
                  </Card>
                ))}
              </div>
            </div>

            {/* ROI */}
            <Card className="p-6 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
              <div className="flex items-center justify-between gap-8 flex-wrap">
                <div>
                  <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    ROI Total
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between gap-8">
                      <span className="text-muted-foreground">Investissement ({study.duration}):</span>
                      <span className="font-semibold text-foreground">{study.roi.investment}</span>
                    </div>
                    <div className="flex justify-between gap-8">
                      <span className="text-muted-foreground">Gain net ({study.duration}):</span>
                      <span className="font-bold text-green-600">{study.roi.gain}</span>
                    </div>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">ROI</p>
                  <p className="text-4xl font-bold text-primary">{study.roi.percentage}</p>
                </div>
              </div>
            </Card>

            {/* Testimonial */}
            <Card className="p-6 bg-accent/5 border-l-4 border-primary">
              <div className="space-y-4">
                <p className="text-lg italic text-foreground">"{study.testimonial.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{study.testimonial.author}</p>
                    <p className="text-sm text-muted-foreground">{study.testimonial.role}</p>
                  </div>
                </div>
              </div>
            </Card>
          </Card>
        ))}
      </div>
    </div>
  );
};
