import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LeadQualificationResults } from './LeadQualificationResults';
import { NewLeadQualification } from './NewLeadQualification';
import { 
  ArrowLeft,
  BarChart3,
  Target,
  Zap,
  FileSpreadsheet,
  MessageSquare
} from 'lucide-react';

type QualificationView = 'menu' | 'results' | 'new-qualification';

interface LeadQualificationMenuProps {
  onBack: () => void;
}

export const LeadQualificationMenu: React.FC<LeadQualificationMenuProps> = ({ onBack }) => {
  const [currentView, setCurrentView] = useState<QualificationView>('menu');

  if (currentView === 'results') {
    return (
      <LeadQualificationResults 
        onBack={() => setCurrentView('menu')}
      />
    );
  }

  if (currentView === 'new-qualification') {
    return (
      <NewLeadQualification 
        onBack={() => setCurrentView('menu')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={onBack} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour au menu Business
          </Button>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-8 border border-gray-200">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Target className="w-8 h-8 text-orange-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Scoring & Qualification des Leads
            </h1>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Évaluez et qualifiez automatiquement vos prospects avec l'IA pour maximiser vos conversions
            </p>
          </div>

          {/* Options principales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Option 1: Voir les résultats */}
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all duration-300 border-2 hover:border-blue-200 group"
              onClick={() => setCurrentView('results')}
            >
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <BarChart3 className="w-8 h-8 text-blue-600" />
                </div>
                <CardTitle className="text-xl text-gray-900 group-hover:text-blue-600 transition-colors">
                  Voir les Résultats de Qualification
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-600 mb-4">
                  Consultez les résultats des qualifications réalisées, les réponses collectées et les scores attribués
                </p>
                <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center">
                    <FileSpreadsheet className="w-4 h-4 mr-1" />
                    <span>Feuilles de réponses</span>
                  </div>
                  <div className="flex items-center">
                    <BarChart3 className="w-4 h-4 mr-1" />
                    <span>Analytics détaillés</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Option 2: Nouvelle qualification */}
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all duration-300 border-2 hover:border-green-200 group"
              onClick={() => setCurrentView('new-qualification')}
            >
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Zap className="w-8 h-8 text-green-600" />
                </div>
                <CardTitle className="text-xl text-gray-900 group-hover:text-green-600 transition-colors">
                  Nouvelle Qualification
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-600 mb-4">
                  Lancez une nouvelle campagne de qualification avec vos bots IA automatisés via différents canaux
                </p>
                <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center">
                    <MessageSquare className="w-4 h-4 mr-1" />
                    <span>Multi-canal</span>
                  </div>
                  <div className="flex items-center">
                    <Target className="w-4 h-4 mr-1" />
                    <span>Bots IA</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Statistiques rapides */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">47</div>
              <div className="text-sm text-gray-600">Leads qualifiés</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">78%</div>
              <div className="text-sm text-gray-600">Taux de réponse</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">8.2/10</div>
              <div className="text-sm text-gray-600">Score moyen</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">12</div>
              <div className="text-sm text-gray-600">Campagnes actives</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};