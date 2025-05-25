
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
  Zap
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
  userContext: 'business' | 'marketing' | 'gestion' | 'citoyen' | 'general';
  onSuggestionClick: (suggestion: Suggestion) => void;
}

export const SuggestionCards: React.FC<SuggestionCardsProps> = ({ 
  userContext, 
  onSuggestionClick 
}) => {
  const getSuggestionsForContext = (context: string): Suggestion[] => {
    switch (context) {
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
            title: 'Réservation restaurant',
            description: 'Trouvez et réservez une table',
            icon: MessageSquare,
            category: 'Services',
            action: 'Réserver une table pour 2 personnes ce soir'
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
