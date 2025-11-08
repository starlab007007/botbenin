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
  },
  {
    id: 'immobilier',
    sector: 'Immobilier',
    company: 'ImmoPlus Bénin',
    location: 'Porto-Novo & Cotonou',
    pack: 'Ventes (15 000 FCFA/mois)',
    duration: '8 mois',
    icon: '🏘️',
    before: {
      metric1: { label: 'Visites/mois', value: '30' },
      metric2: { label: 'Taux de concrétisation', value: '8%' },
      metric3: { label: 'Temps prospection', value: '25h/semaine' },
      metric4: { label: 'Coûts marketing', value: '180 000 FCFA/mois' }
    },
    implementation: [
      'IA Rapport Pre-Call sur acheteurs potentiels',
      'Bot qualification budgets et besoins',
      'Visites virtuelles automatiques WhatsApp',
      'CRM suivi prospects et biens'
    ],
    results: {
      metric1: { label: 'Visites/mois', before: '30', after: '95', change: '+217%' },
      metric2: { label: 'Taux de concrétisation', before: '8%', after: '18%', change: '+125%' },
      metric3: { label: 'Temps prospection', before: '25h/sem', after: '8h/sem', change: '-68%' },
      metric4: { label: 'Ventes/mois', before: '2.4', after: '7.2', change: '+200%' }
    },
    roi: {
      investment: '120 000 FCFA',
      gain: '12 800 000 FCFA',
      percentage: '10567%'
    },
    testimonial: {
      quote: "Le rapport Pre-Call m'a fait économiser des heures de recherche sur chaque prospect. Je connais leur situation financière et leurs besoins avant même de les appeler. Mes ventes ont triplé !",
      author: 'Jean-Claude Ahouandjinou',
      role: 'Agent Immobilier Principal'
    }
  },
  {
    id: 'b2b-consulting',
    sector: 'Services B2B',
    company: 'BizConsult Africa',
    location: 'Abidjan, Côte d\'Ivoire',
    pack: 'Ventes (15 000 FCFA/mois)',
    duration: '6 mois',
    icon: '💼',
    before: {
      metric1: { label: 'Prospects qualifiés/mois', value: '15' },
      metric2: { label: 'Taux de conversion', value: '12%' },
      metric3: { label: 'Cycle de vente', value: '90 jours' },
      metric4: { label: 'CA mensuel', value: '8M FCFA' }
    },
    implementation: [
      'IA Business pour recherche B2B ciblée',
      'Scoring automatique prospects (0-100)',
      'Campagnes engagement LinkedIn + Email',
      'Rapports Pre-Call automatiques'
    ],
    results: {
      metric1: { label: 'Prospects qualifiés/mois', before: '15', after: '78', change: '+420%' },
      metric2: { label: 'Taux de conversion', before: '12%', after: '24%', change: '+100%' },
      metric3: { label: 'Cycle de vente', before: '90j', after: '45j', change: '-50%' },
      metric4: { label: 'CA mensuel', before: '8M', after: '22M FCFA', change: '+175%' }
    },
    roi: {
      investment: '90 000 FCFA',
      gain: '84 000 000 FCFA',
      percentage: '93233%'
    },
    testimonial: {
      quote: "Bot.bj nous a permis de scaler notre prospection B2B sans recruter. L'IA trouve et qualifie les prospects, nous on se concentre sur la vente. Résultat : CA multiplié par 2.75 en 6 mois.",
      author: 'Kofi Mensah',
      role: 'CEO BizConsult Africa'
    }
  },
  {
    id: 'agence-marketing',
    sector: 'Marketing & Communication',
    company: 'CreativeLab',
    location: 'Dakar, Sénégal',
    pack: 'Automatisation Marketing (7 500 FCFA/mois)',
    duration: '5 mois',
    icon: '🎨',
    before: {
      metric1: { label: 'Clients gérés', value: '8' },
      metric2: { label: 'Coûts graphisme', value: '320 000 FCFA/mois' },
      metric3: { label: 'Temps création contenus', value: '40h/semaine' },
      metric4: { label: 'Marge nette', value: '18%' }
    },
    implementation: [
      'IA Créateur Visuel pour clients (illimité)',
      'Production vidéo IA automatisée',
      'Templates sectoriels par client',
      'Galerie marketing centralisée'
    ],
    results: {
      metric1: { label: 'Clients gérés', before: '8', after: '22', change: '+175%' },
      metric2: { label: 'Coûts graphisme', before: '320k', after: '7.5k FCFA/mois', change: '-98%' },
      metric3: { label: 'Temps création', before: '40h/sem', after: '12h/sem', change: '-70%' },
      metric4: { label: 'Marge nette', before: '18%', after: '48%', change: '+30pts' }
    },
    roi: {
      investment: '37 500 FCFA',
      gain: '15 600 000 FCFA',
      percentage: '41500%'
    },
    testimonial: {
      quote: "Avant Bot.bj, on payait 2 graphistes. Maintenant l'IA génère tout en quelques secondes. On a pu accepter 3x plus de clients avec la même équipe. C'est une révolution !",
      author: 'Aïssatou Diop',
      role: 'Directrice Créative'
    }
  },
  {
    id: 'restaurant',
    sector: 'Restauration & Livraison',
    company: 'Chez Maman Africaine',
    location: 'Ouagadougou, Burkina Faso',
    pack: 'Professionnel (5 000 FCFA/mois)',
    duration: '4 mois',
    icon: '🍕',
    before: {
      metric1: { label: 'Commandes/jour', value: '35' },
      metric2: { label: 'Erreurs de commande', value: '15%' },
      metric3: { label: 'Temps prise commande', value: '8 min' },
      metric4: { label: 'Personnel accueil', value: '2 personnes' }
    },
    implementation: [
      'Bot WhatsApp pour commandes 24/7',
      'Menu digital interactif',
      'Confirmation automatique + suivi livraison',
      'Collecte feedback automatique'
    ],
    results: {
      metric1: { label: 'Commandes/jour', before: '35', after: '98', change: '+180%' },
      metric2: { label: 'Erreurs', before: '15%', after: '2%', change: '-87%' },
      metric3: { label: 'Temps commande', before: '8 min', after: '2 min', change: '-75%' },
      metric4: { label: 'CA mensuel', before: '3.5M', after: '8.2M FCFA', change: '+134%' }
    },
    roi: {
      investment: '20 000 FCFA',
      gain: '18 800 000 FCFA',
      percentage: '93900%'
    },
    testimonial: {
      quote: "Le bot prend les commandes parfaitement, sans erreur. Plus besoin d'avoir quelqu'un au téléphone. Nos clients adorent commander sur WhatsApp. On a doublé notre chiffre !",
      author: 'Fatimata Ouedraogo',
      role: 'Propriétaire Chez Maman Africaine'
    }
  },
  {
    id: 'salon-beaute',
    sector: 'Beauté & Bien-être',
    company: 'Beauty Queens Salon',
    location: 'Niamey, Niger',
    pack: 'Essentiel (3 000 FCFA/mois)',
    duration: '3 mois',
    icon: '💇',
    before: {
      metric1: { label: 'RDV/jour', value: '12' },
      metric2: { label: 'No-show', value: '25%' },
      metric3: { label: 'Temps téléphone', value: '3h/jour' },
      metric4: { label: 'Satisfaction', value: '72%' }
    },
    implementation: [
      'Bot prise RDV automatique WhatsApp',
      'Rappels automatiques 24h avant',
      'Catalogue services avec tarifs',
      'Collecte avis clients'
    ],
    results: {
      metric1: { label: 'RDV/jour', before: '12', after: '28', change: '+133%' },
      metric2: { label: 'No-show', before: '25%', after: '5%', change: '-80%' },
      metric3: { label: 'Temps téléphone', before: '3h/j', after: '20min/j', change: '-89%' },
      metric4: { label: 'Satisfaction', before: '72%', after: '96%', change: '+24pts' }
    },
    roi: {
      investment: '9 000 FCFA',
      gain: '4 800 000 FCFA',
      percentage: '53233%'
    },
    testimonial: {
      quote: "Avant je passais des heures au téléphone pour les rendez-vous. Maintenant le bot gère tout automatiquement. Les clientes adorent et on n'a presque plus de no-show grâce aux rappels.",
      author: 'Mariama Sani',
      role: 'Gérante Beauty Queens'
    }
  },
  {
    id: 'salle-sport',
    sector: 'Sport & Fitness',
    company: 'FitZone Gym',
    location: 'Lomé, Togo',
    pack: 'Service Client (10 000 FCFA/mois)',
    duration: '7 mois',
    icon: '🏋️',
    before: {
      metric1: { label: 'Membres actifs', value: '180' },
      metric2: { label: 'Taux de rétention', value: '68%' },
      metric3: { label: 'Nouvelles inscriptions/mois', value: '15' },
      metric4: { label: 'Personnel accueil', value: '3 personnes' }
    },
    implementation: [
      'Bot inscription et FAQ automatique',
      'Rappels automatiques séances',
      'Coaching IA motivationnel',
      'Gestion absences et paiements'
    ],
    results: {
      metric1: { label: 'Membres actifs', before: '180', after: '420', change: '+133%' },
      metric2: { label: 'Taux de rétention', before: '68%', after: '87%', change: '+19pts' },
      metric3: { label: 'Inscriptions/mois', before: '15', after: '52', change: '+247%' },
      metric4: { label: 'CA mensuel', before: '9M', after: '23M FCFA', change: '+156%' }
    },
    roi: {
      investment: '70 000 FCFA',
      gain: '98 000 000 FCFA',
      percentage: '139900%'
    },
    testimonial: {
      quote: "Le bot envoie des messages motivants à nos membres, rappelle leurs séances, et gère les inscriptions 24/7. Notre taux de rétention a explosé et on a plus que doublé nos membres !",
      author: 'Emmanuel Koffi',
      role: 'Directeur FitZone Gym'
    }
  },
  {
    id: 'concessionnaire',
    sector: 'Automobile',
    company: 'AutoPlus Bénin',
    location: 'Cotonou, Bénin',
    pack: 'Ventes (15 000 FCFA/mois)',
    duration: '9 mois',
    icon: '🚗',
    before: {
      metric1: { label: 'Demandes info/mois', value: '120' },
      metric2: { label: 'Essais organisés/mois', value: '35' },
      metric3: { label: 'Taux de conversion', value: '8%' },
      metric4: { label: 'Ventes/mois', value: '3 véhicules' }
    },
    implementation: [
      'Bot catalogue véhicules intelligent',
      'Qualification budgets automatique',
      'Prise RDV essais automatisée',
      'Suivi pipeline CRM intégré'
    ],
    results: {
      metric1: { label: 'Demandes info/mois', before: '120', after: '380', change: '+217%' },
      metric2: { label: 'Essais/mois', before: '35', after: '125', change: '+257%' },
      metric3: { label: 'Taux de conversion', before: '8%', after: '15%', change: '+87%' },
      metric4: { label: 'Ventes/mois', before: '3', after: '11 véhicules', change: '+267%' }
    },
    roi: {
      investment: '135 000 FCFA',
      gain: '240 000 000 FCFA',
      percentage: '177678%'
    },
    testimonial: {
      quote: "Le bot qualifie les vrais acheteurs automatiquement. On ne perd plus de temps avec des curieux. Nos vendeurs se concentrent sur ceux qui sont prêts à acheter. Ventes x3.7 !",
      author: 'Pascal Dossou',
      role: 'Directeur Commercial AutoPlus'
    }
  },
  {
    id: 'mairie',
    sector: 'Services Publics',
    company: 'Mairie de Parakou',
    location: 'Parakou, Bénin',
    pack: 'IA Citoyen (50 000 FCFA/mois)',
    duration: '12 mois',
    icon: '🏛️',
    before: {
      metric1: { label: 'Demandes/jour', value: '200' },
      metric2: { label: 'Temps d\'attente moyen', value: '2h30' },
      metric3: { label: 'Agents guichet', value: '12 personnes' },
      metric4: { label: 'Satisfaction citoyens', value: '45%' }
    },
    implementation: [
      'Bot IA Citoyen multilingue (français + fon)',
      'Info démarches administratives 24/7',
      'Prise RDV en ligne (état civil, urbanisme)',
      'Suivi dossiers citoyens'
    ],
    results: {
      metric1: { label: 'Demandes/jour', before: '200', after: '650', change: '+225%' },
      metric2: { label: 'Temps d\'attente', before: '2h30', after: '20min', change: '-87%' },
      metric3: { label: 'Agents guichet', before: '12', after: '8 personnes', change: '-33%' },
      metric4: { label: 'Satisfaction', before: '45%', after: '88%', change: '+43pts' }
    },
    roi: {
      investment: '600 000 FCFA',
      gain: '48 000 000 FCFA',
      percentage: '7900%'
    },
    testimonial: {
      quote: "Les citoyens peuvent désormais avoir l'info 24/7 et prendre RDV en ligne. Plus de files d'attente interminables. La satisfaction a doublé et on a économisé 4M FCFA/mois en personnel.",
      author: 'Dr. Alassane Seidou',
      role: 'Maire de Parakou'
    }
  },
  {
    id: 'ong',
    sector: 'ONG & Associations',
    company: 'Humanité Sans Frontières',
    location: 'Multi-pays Afrique de l\'Ouest',
    pack: 'Service Client (10 000 FCFA/mois)',
    duration: '10 mois',
    icon: '🤝',
    before: {
      metric1: { label: 'Bénévoles recrutés/mois', value: '8' },
      metric2: { label: 'Dons collectés/mois', value: '2.5M FCFA' },
      metric3: { label: 'Temps coordination', value: '30h/semaine' },
      metric4: { label: 'Portée communication', value: '5 000 pers' }
    },
    implementation: [
      'Bot recrutement bénévoles automatisé',
      'Campagnes de dons WhatsApp',
      'Info missions et impact en temps réel',
      'Newsletter automatique multilingue'
    ],
    results: {
      metric1: { label: 'Bénévoles/mois', before: '8', after: '45', change: '+463%' },
      metric2: { label: 'Dons/mois', before: '2.5M', after: '8.7M FCFA', change: '+248%' },
      metric3: { label: 'Temps coordination', before: '30h/sem', after: '10h/sem', change: '-67%' },
      metric4: { label: 'Portée', before: '5k', after: '28k personnes', change: '+460%' }
    },
    roi: {
      investment: '100 000 FCFA',
      gain: '62 000 000 FCFA',
      percentage: '61900%'
    },
    testimonial: {
      quote: "Bot.bj nous a permis de toucher 5x plus de personnes avec le même budget. Les dons ont triplé et on recrute 6x plus de bénévoles. C'est un multiplicateur d'impact incroyable !",
      author: 'Aminata Traoré',
      role: 'Directrice Exécutive HSF'
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
