import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HybridSuggestionSystem } from '@/components/HybridSuggestionSystem';
import { useBotDomains } from '@/hooks/useBotDomains';
import { Bot, Brain, Target, Zap } from 'lucide-react';

interface IntelligentSuggestionsDemoProps {
  botId?: string;
  userContext?: 'business' | 'marketing' | 'gestion' | 'citoyen' | 'services_locaux' | 'restaurant' | 'general';
}

export const IntelligentSuggestionsDemo: React.FC<IntelligentSuggestionsDemoProps> = ({
  botId,
  userContext = 'general'
}) => {
  const [messages, setMessages] = useState<string[]>([]);
  const { assignments, detectBotDomains, loading } = useBotDomains(botId);

  const handleSuggestionClick = (action: string) => {
    setMessages(prev => [...prev, `💬 ${action}`]);
  };

  const handleDetectDomains = async () => {
    if (botId) {
      const detectedDomains = await detectBotDomains();
      setMessages(prev => [
        ...prev, 
        `🔍 Détection automatique: ${detectedDomains.length} domaines trouvés`
      ]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header de démonstration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="w-5 h-5 text-blue-500" />
            <span>Système de Suggestions Intelligentes</span>
            <Badge variant="outline">Démonstration</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="flex items-center space-x-2 text-sm">
              <Bot className="w-4 h-4 text-green-500" />
              <span>Bot ID: {botId ? botId.slice(0, 8) + '...' : 'Non défini'}</span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <Target className="w-4 h-4 text-orange-500" />
              <span>Contexte: {userContext}</span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <Zap className="w-4 h-4 text-purple-500" />
              <span>Domaines assignés: {assignments.length}</span>
            </div>
          </div>

          {botId && (
            <div className="space-y-2">
              <Button 
                onClick={handleDetectDomains} 
                disabled={loading}
                variant="outline"
                size="sm"
              >
                🔍 Détecter les domaines automatiquement
              </Button>
              
              {assignments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {assignments.map((assignment) => (
                    <Badge key={assignment.id} variant="secondary">
                      {assignment.domain.name} 
                      <span className="ml-1 text-xs">
                        ({Math.round(assignment.confidence_score * 100)}%)
                      </span>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Système de suggestions hybride */}
      <HybridSuggestionSystem
        botId={botId}
        userContext={userContext}
        onSuggestionClick={handleSuggestionClick}
      />

      {/* Journal des interactions */}
      {messages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Journal des interactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {messages.map((message, index) => (
                <div key={index} className="text-xs p-2 bg-gray-50 rounded">
                  {message}
                </div>
              ))}
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setMessages([])}
              className="mt-2 text-xs"
            >
              Effacer le journal
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};