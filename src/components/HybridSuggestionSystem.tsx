import React from 'react';
import { IntelligentSuggestionCards } from '@/components/IntelligentSuggestionCards';
import { SuggestionCards } from '@/components/SuggestionCards';

interface HybridSuggestionSystemProps {
  botId?: string;
  userContext: 'business' | 'marketing' | 'gestion' | 'citoyen' | 'services_locaux' | 'restaurant' | 'general';
  onSuggestionClick: (action: string) => void;
}

export const HybridSuggestionSystem: React.FC<HybridSuggestionSystemProps> = ({
  botId,
  userContext,
  onSuggestionClick
}) => {
  return (
    <div className="space-y-6">
      {/* Système intelligent (prioritaire si botId disponible) */}
      {botId && (
        <IntelligentSuggestionCards
          botId={botId}
          onSuggestionClick={onSuggestionClick}
          limit={4}
        />
      )}

      {/* Système de fallback (suggestions contextuelles classiques) */}
      <SuggestionCards
        userContext={userContext}
        onSuggestionClick={(suggestion) => onSuggestionClick(suggestion.action)}
      />
    </div>
  );
};