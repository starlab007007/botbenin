import React from 'react';
import { Card } from '@/components/ui/card';
import { 
  Briefcase, 
  TrendingUp, 
  Users, 
  Calendar, 
  FileText, 
  BarChart3,
  MessageSquare,
  Zap,
  MapPin,
  Home,
  Car,
  Utensils,
  ShoppingBag,
  Wrench,
  Eye,
  Sparkles,
  GraduationCap,
  Building
} from 'lucide-react';

interface Suggestion {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  category: string;
  action: string;
}

interface SuggestionCardsProps {
  userContext: 'business' | 'marketing' | 'gestion' | 'citoyen' | 'services_locaux' | 'restaurant' | 'immobilier' | 'optique' | 'cosmetiques' | 'consultations_formations' | 'general';
  onSuggestionClick: (suggestion: Suggestion) => void;
}

export const SuggestionCards: React.FC<SuggestionCardsProps> = ({ 
  userContext, 
  onSuggestionClick 
}) => {
  const getSuggestionsForContext = (context: string): Suggestion[] => {
    switch (context) {
      case 'restaurant':
        return [
          {
            id: 'r1',
            title: 'Spécialité du jour',
            description: 'Découvrez les plats d\'aujourd\'hui',
            icon: Utensils,
            category: 'Menu',
            action: 'Quelle est votre spécialité du jour ?'
          },
          {
            id: 'r2',
            title: 'Réservation',
            description: 'Réserver une table facilement',
            icon: Calendar,
            category: 'Disponibilité',
            action: 'Avez-vous une table disponible pour ce soir ?'
          },
          {
            id: 'r3',
            title: 'Livraison',
            description: 'Service de livraison à domicile',
            icon: Car,
            category: 'Service',
            action: 'Proposez-vous la livraison à domicile ?'
          }
        ];
        
      case 'immobilier':
        return [
          {
            id: 'immo1',
            title: 'Appartement 2 pièces',
            description: 'Rechercher un logement à Cotonou',
            icon: Building,
            category: 'Location',
            action: 'Je cherche un appartement 2 pièces à Cotonou'
          },
          {
            id: 'immo2',
            title: 'Prix au m²',
            description: 'Connaître les tarifs immobiliers',
            icon: BarChart3,
            category: 'Prix',
            action: 'Quels sont les prix au m² à Calavi ?'
          },
          {
            id: 'immo3',
            title: 'Terrain constructible',
            description: 'Trouver un terrain à bâtir',
            icon: MapPin,
            category: 'Terrain',
            action: 'Avez-vous des terrains constructibles ?'
          }
        ];
        
      case 'optique':
        return [
          {
            id: 'opt1',
            title: 'Examen de vue',
            description: 'Contrôle de votre vision',
            icon: Eye,
            category: 'Consultation',
            action: 'J\'ai besoin d\'un examen de vue'
          },
          {
            id: 'opt2',
            title: 'Marques de lunettes',
            description: 'Découvrir notre sélection',
            icon: Eye,
            category: 'Produits',
            action: 'Quelles marques de lunettes proposez-vous ?'
          },
          {
            id: 'opt3',
            title: 'Mutuelle santé',
            description: 'Prise en charge assurance',
            icon: FileText,
            category: 'Paiement',
            action: 'Acceptez-vous la mutuelle santé ?'
          },
          {
            id: 'opt4',
            title: 'Lunettes progressives',
            description: 'Tarifs des verres progressifs',
            icon: BarChart3,
            category: 'Prix',
            action: 'Combien coûte une paire de lunettes progressives ?'
          },
          {
            id: 'opt5',
            title: 'Lentilles de contact',
            description: 'Alternative aux lunettes',
            icon: Eye,
            category: 'Produits',
            action: 'Proposez-vous des lentilles de contact ?'
          }
        ];
        
      case 'cosmetiques':
        return [
          {
            id: 'cosm1',
            title: 'Peau grasse',
            description: 'Soins adaptés aux peaux grasses',
            icon: Sparkles,
            category: 'Soins',
            action: 'Quels produits pour peau grasse ?'
          },
          {
            id: 'cosm2',
            title: 'Anti-âge',
            description: 'Produits contre le vieillissement',
            icon: Sparkles,
            category: 'Soins',
            action: 'Avez-vous des soins anti-âge ?'
          },
          {
            id: 'cosm3',
            title: 'Fond de teint',
            description: 'Teint parfait pour peau mate',
            icon: Sparkles,
            category: 'Maquillage',
            action: 'Je cherche un fond de teint pour peau mate'
          },
          {
            id: 'cosm4',
            title: 'Produits bio',
            description: 'Cosmétiques naturels et bio',
            icon: Sparkles,
            category: 'Bio',
            action: 'Proposez-vous des produits bio ?'
          }
        ];
        
      case 'consultations_formations':
        return [
          {
            id: 'form1',
            title: 'Nos formations',
            description: 'Catalogue de formations disponibles',
            icon: GraduationCap,
            category: 'Formation',
            action: 'Quelles formations proposez-vous ?'
          },
          {
            id: 'form2',
            title: 'Rendez-vous',
            description: 'Prendre un rendez-vous de consultation',
            icon: Calendar,
            category: 'Consultation',
            action: 'Comment prendre rendez-vous ?'
          },
          {
            id: 'form3',
            title: 'Formation en ligne',
            description: 'Apprentissage à distance',
            icon: MessageSquare,
            category: 'E-learning',
            action: 'Proposez-vous des formations en ligne ?'
          },
          {
            id: 'form4',
            title: 'Coût consultation',
            description: 'Tarifs de nos consultations',
            icon: BarChart3,
            category: 'Prix',
            action: 'Quel est le coût d\'une consultation ?'
          },
          {
            id: 'form5',
            title: 'Certifications',
            description: 'Reconnaissance officielle',
            icon: FileText,
            category: 'Certification',
            action: 'Avez-vous des certifications reconnues ?'
          },
          {
            id: 'form6',
            title: 'Management',
            description: 'Formations en gestion d\'équipe',
            icon: Users,
            category: 'Management',
            action: 'Formations disponibles en management ?'
          }
        ];
        
      case 'services_locaux':
        return [
          {
            id: 'sl1',
            title: 'Trouver un restaurant',
            description: 'Découvrez les meilleurs restaurants près de chez vous',
            icon: Utensils,
            category: 'Restauration',
            action: 'Je cherche un bon restaurant français dans le centre-ville'
          },
          {
            id: 'sl2',
            title: 'Réserver un hôtel',
            description: 'Trouvez l\'hébergement parfait pour votre séjour',
            icon: Home,
            category: 'Hébergement',
            action: 'J\'ai besoin d\'un hôtel 3 étoiles pour ce weekend'
          },
          {
            id: 'sl3',
            title: 'Services de réparation',
            description: 'Contactez des professionnels pour vos réparations',
            icon: Wrench,
            category: 'Réparation',
            action: 'Je cherche un plombier disponible en urgence'
          },
          {
            id: 'sl4',
            title: 'Commerces de proximité',
            description: 'Explorez les magasins et services autour de vous',
            icon: ShoppingBag,
            category: 'Shopping',
            action: 'Où puis-je acheter des produits bio près de chez moi ?'
          }
        ];
        
      case 'business':
        return [
          {
            id: '1',
            title: 'Analyser mes leads',
            description: 'Obtenez un rapport détaillé sur vos prospects actuels',
            icon: BarChart3,
            category: 'CRM',
            action: 'Analyser les performances de mes leads du mois dernier'
          },
          {
            id: '2',
            title: 'Créer un contrat',
            description: 'Générez un contrat professionnel personnalisé',
            icon: FileText,
            category: 'Documents',
            action: 'Créer un nouveau contrat de service'
          },
          {
            id: '3',
            title: 'Planifier des suivis',
            description: 'Automatisez vos relances clients',
            icon: Calendar,
            category: 'Automatisation',
            action: 'Configurer des rappels automatiques pour mes clients'
          },
          {
            id: '4',
            title: 'Scorer mes contacts',
            description: 'Évaluez le potentiel de vos prospects',
            icon: TrendingUp,
            category: 'Analyse',
            action: 'Analyser et scorer tous mes contacts CRM'
          }
        ];
      
      case 'marketing':
        return [
          {
            id: '5',
            title: 'Campagne email',
            description: 'Créez une campagne emailing personnalisée',
            icon: MessageSquare,
            category: 'Communication',
            action: 'Créer une nouvelle campagne emailing pour mes prospects'
          },
          {
            id: '6',
            title: 'Analyser les performances',
            description: 'Consultez vos statistiques marketing',
            icon: BarChart3,
            category: 'Analytics',
            action: 'Afficher les performances de mes dernières campagnes'
          },
          {
            id: '7',
            title: 'Segmenter l\'audience',
            description: 'Organisez vos contacts par critères',
            icon: Users,
            category: 'Ciblage',
            action: 'Segmenter ma base de contacts par critères démographiques'
          },
          {
            id: '8',
            title: 'Automatiser le tunnel',
            description: 'Configurez un parcours client automatisé',
            icon: Zap,
            category: 'Automation',
            action: 'Créer un tunnel de conversion automatisé'
          }
        ];
      
      case 'gestion':
        return [
          {
            id: '9',
            title: 'Workflow RH',
            description: 'Automatisez vos processus de recrutement',
            icon: Users,
            category: 'RH',
            action: 'Créer un workflow de recrutement automatisé'
          },
          {
            id: '10',
            title: 'Suivi de projet',
            description: 'Organisez le suivi de vos projets',
            icon: Briefcase,
            category: 'Projet',
            action: 'Configurer le suivi automatique de mes projets en cours'
          },
          {
            id: '11',
            title: 'Générer des rapports',
            description: 'Créez des rapports de gestion automatiques',
            icon: FileText,
            category: 'Reporting',
            action: 'Générer un rapport mensuel de performance'
          },
          {
            id: '12',
            title: 'Alertes métier',
            description: 'Configurez des notifications intelligentes',
            icon: Zap,
            category: 'Monitoring',
            action: 'Configurer des alertes pour les indicateurs clés'
          }
        ];
      
      case 'citoyen':
        return [
          {
            id: '13',
            title: 'Recherche d\'emploi',
            description: 'Trouvez des opportunités qui vous correspondent',
            icon: Briefcase,
            category: 'Emploi',
            action: 'Rechercher des offres d\'emploi dans le numérique'
          },
          {
            id: '14',
            title: 'Aide juridique',
            description: 'Obtenez des informations juridiques de base',
            icon: FileText,
            category: 'Juridique',
            action: 'J\'ai besoin d\'aide pour comprendre mes droits locataires'
          },
          {
            id: '15',
            title: 'Démarches admin',
            description: 'Guidage pour vos formalités administratives',
            icon: Calendar,
            category: 'Administration',
            action: 'Comment obtenir un certificat de naissance ?'
          },
          {
            id: '16',
            title: 'Services locaux',
            description: 'Trouvez restaurants, hôtels et commerces',
            icon: MapPin,
            category: 'Services',
            action: 'Je cherche un restaurant italien ouvert ce soir'
          }
        ];
      
      default:
        return [
          {
            id: '17',
            title: 'Explorer Bot.Bj',
            description: 'Découvrez toutes les fonctionnalités',
            icon: Zap,
            category: 'Découverte',
            action: 'Que pouvez-vous faire pour m\'aider ?'
          },
          {
            id: '18',
            title: 'Automatiser mes tâches',
            description: 'Gagnez du temps avec l\'automatisation',
            icon: BarChart3,
            category: 'Productivité',
            action: 'Comment puis-je automatiser mes tâches répétitives ?'
          },
          {
            id: '19',
            title: 'Créer un workflow',
            description: 'Construisez vos processus sur mesure',
            icon: Briefcase,
            category: 'Workflow',
            action: 'Aide-moi à créer mon premier workflow automatisé'
          }
        ];
    }
  };

  const suggestions = getSuggestionsForContext(userContext);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      {suggestions.map((suggestion) => {
        const IconComponent = suggestion.icon;
        return (
          <Card
            key={suggestion.id}
            className="suggestion-card group"
            onClick={() => onSuggestionClick(suggestion)}
          >
            <div className="flex items-start space-x-4">
              <div className="p-2 rounded-lg bg-gradient-to-r from-blue-600/20 to-purple-600/20 group-hover:from-blue-600/30 group-hover:to-purple-600/30 transition-all duration-300">
                <IconComponent className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-white text-sm mb-1 group-hover:text-blue-300 transition-colors">
                  {suggestion.title}
                </h4>
                <p className="text-xs text-gray-400 mb-2 line-clamp-2">
                  {suggestion.description}
                </p>
                <span className="inline-block px-2 py-1 text-xs bg-slate-700/50 text-gray-300 rounded-full">
                  {suggestion.category}
                </span>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
