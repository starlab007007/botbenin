import React from 'react';
import { IntelligentSuggestionsDemo } from '@/components/IntelligentSuggestionsDemo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSearchParams } from 'react-router-dom';

export const IntelligentSuggestionsTestPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const botId = searchParams.get('botId');
  const context = searchParams.get('context') as any;

  return (
    <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Test du Système de Suggestions Intelligentes
          </h1>
          <p className="text-gray-600 max-w-2xl">
            Cette page permet de tester le nouveau système de suggestions intelligentes qui 
            s'adapte automatiquement au domaine des bots et fournit des suggestions personnalisées.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Test avec Bot ID spécifique */}
          <Card>
            <CardHeader>
              <CardTitle>Test avec Bot ID</CardTitle>
            </CardHeader>
            <CardContent>
              <IntelligentSuggestionsDemo
                botId={botId || "0190c123-456789-abcdef"}
                userContext={context || "services_locaux"}
              />
            </CardContent>
          </Card>

          {/* Test sans Bot ID (fallback) */}
          <Card>
            <CardHeader>
              <CardTitle>Test Fallback (sans Bot ID)</CardTitle>
            </CardHeader>
            <CardContent>
              <IntelligentSuggestionsDemo
                userContext="restaurant"
              />
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Comment utiliser cette page de test</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Paramètres URL supportés :</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                  <li><strong>?botId=UUID</strong> - ID du bot pour les suggestions intelligentes</li>
                  <li><strong>?context=TYPE</strong> - Contexte manuel (restaurant, services_locaux, business, etc.)</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Exemples d'URLs :</h4>
                <div className="space-y-2 text-sm">
                  <div className="bg-gray-100 p-2 rounded font-mono">
                    /test-suggestions?botId=123&context=restaurant
                  </div>
                  <div className="bg-gray-100 p-2 rounded font-mono">
                    /test-suggestions?context=business
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Fonctionnalités testées :</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                  <li>Détection automatique des domaines de bots</li>
                  <li>Suggestions intelligentes personnalisées</li>
                  <li>Système de fallback avec suggestions contextuelles</li>
                  <li>Tracking des clics et métriques</li>
                  <li>Assignation automatique de domaines aux nouveaux bots</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
    </div>
  );
};