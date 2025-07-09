import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useIntelligentSuggestions } from '@/hooks/useIntelligentSuggestions';
import * as LucideIcons from 'lucide-react';

interface IntelligentSuggestionCardsProps {
  botId?: string;
  onSuggestionClick: (action: string) => void;
  limit?: number;
}

export const IntelligentSuggestionCards: React.FC<IntelligentSuggestionCardsProps> = ({ 
  botId, 
  onSuggestionClick,
  limit = 4
}) => {
  const { suggestions, loading, error, trackSuggestionClick } = useIntelligentSuggestions(botId, limit);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {Array.from({ length: limit }).map((_, index) => (
          <Card key={index} className="animate-pulse">
            <div className="flex items-start space-x-4 p-4">
              <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 mb-6">
        <p>Erreur lors du chargement des suggestions: {error}</p>
      </div>
    );
  }

  if (!suggestions.length) {
    return null; // Pas de suggestions intelligentes trouvées
  }

  const handleSuggestionClick = async (suggestion: any) => {
    await trackSuggestionClick(suggestion.suggestion_id);
    onSuggestionClick(suggestion.action_prompt);
  };

  return (
    <div className="space-y-4 mb-6">
      {/* Header avec badge de domaine intelligent */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          Suggestions intelligentes
        </h3>
        <Badge variant="secondary" className="text-xs">
          IA {suggestions[0]?.domain_name}
        </Badge>
      </div>

      {/* Grille de suggestions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {suggestions.map((suggestion) => {
          // Récupérer l'icône dynamiquement
          const IconComponent = (LucideIcons as any)[suggestion.icon_name] || LucideIcons.Zap;
          
          return (
            <Card
              key={suggestion.suggestion_id}
              className="suggestion-card group cursor-pointer hover:shadow-md transition-all duration-300"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <div className="flex items-start space-x-4 p-4">
                <div className="p-2 rounded-lg bg-gradient-to-r from-blue-600/20 to-purple-600/20 group-hover:from-blue-600/30 group-hover:to-purple-600/30 transition-all duration-300">
                  <IconComponent className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-white text-sm group-hover:text-blue-300 transition-colors">
                      {suggestion.title}
                    </h4>
                    {suggestion.confidence_score > 0.8 && (
                      <Badge variant="outline" className="text-xs ml-2">
                        Recommandé
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mb-2 line-clamp-2">
                    {suggestion.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-xs">
                      {suggestion.category}
                    </Badge>
                    <div className="flex items-center text-xs text-gray-500">
                      <div 
                        className="w-2 h-2 rounded-full mr-1"
                        style={{
                          backgroundColor: suggestion.confidence_score > 0.8 
                            ? '#10b981' 
                            : suggestion.confidence_score > 0.5 
                            ? '#f59e0b' 
                            : '#6b7280'
                        }}
                      />
                      {Math.round(suggestion.confidence_score * 100)}%
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Footer informatif */}
      <p className="text-xs text-gray-500 text-center">
        Suggestions personnalisées basées sur le domaine de votre bot
      </p>
    </div>
  );
};