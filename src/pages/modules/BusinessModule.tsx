
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Briefcase, 
  Send, 
  TrendingUp, 
  Users, 
  Mail, 
  Sparkles, 
  Target,
  ArrowRight,
  ChevronLeft
} from 'lucide-react';

export const BusinessModule: React.FC = () => {
  const [selectedProblem, setSelectedProblem] = useState<string | null>(null);
  const [leadScore, setLeadScore] = useState('');
  const [automaticFollowUp, setAutomaticFollowUp] = useState('');

  const problems = [
    {
      id: 'outreach',
      title: "Ma prospection ne fonctionne pas",
      description: "Créez des messages personnalisés avec des données uniques pour attirer l'attention.",
      icon: Send,
      color: 'bg-purple-100',
      iconColor: 'text-purple-600'
    },
    {
      id: 'customers',
      title: "Je n'ai pas assez de clients",
      description: "Trouvez de nouvelles façons d'élargir votre portée et d'attirer plus de prospects.",
      icon: Users,
      color: 'bg-orange-100',
      iconColor: 'text-orange-600'
    },
    {
      id: 'targeting',
      title: "J'ai besoin de plus de données pour un meilleur ciblage",
      description: "Accédez aux points de données de la marketplace de Clay pour identifier et prioriser vos prospects idéaux.",
      icon: Target,
      color: 'bg-yellow-100',
      iconColor: 'text-yellow-600'
    },
    {
      id: 'contact-data',
      title: "J'ai de mauvaises données de contact",
      description: "Améliorez la qualité des données pour vous connecter avec les bonnes personnes.",
      icon: Mail,
      color: 'bg-blue-100',
      iconColor: 'text-blue-600'
    },
    {
      id: 'ai-tools',
      title: "J'ai besoin d'utiliser l'IA",
      description: "Exploitez les insights pilotés par l'IA pour travailler plus intelligemment et plus rapidement.",
      icon: Sparkles,
      color: 'bg-pink-100',
      iconColor: 'text-pink-600'
    },
    {
      id: 'exploring',
      title: "Je ne sais pas, j'explore juste",
      description: "Jetez un œil et découvrez comment Clay s'intègre dans votre processus.",
      icon: TrendingUp,
      color: 'bg-green-100',
      iconColor: 'text-green-600'
    }
  ];

  const handleProblemSelect = (problemId: string) => {
    setSelectedProblem(problemId);
  };

  const handleBack = () => {
    setSelectedProblem(null);
  };

  const handleContinue = () => {
    console.log('Problème sélectionné:', selectedProblem);
    console.log('Score des leads:', leadScore);
    console.log('Suivi automatique:', automaticFollowUp);
    // Ici vous pouvez ajouter la logique pour traiter les données
  };

  if (selectedProblem) {
    const problem = problems.find(p => p.id === selectedProblem);
    
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto p-6">
          {/* Header avec bouton retour */}
          <div className="mb-8">
            <Button 
              variant="ghost" 
              onClick={handleBack}
              className="mb-4 text-gray-600 hover:text-gray-900"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center mb-4">
                <div className={`w-12 h-12 ${problem?.color} rounded-lg flex items-center justify-center mr-4`}>
                  {problem?.icon && <problem.icon className={`w-6 h-6 ${problem.iconColor}`} />}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{problem?.title}</h1>
                  <p className="text-gray-600 mt-1">{problem?.description}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Formulaire de configuration */}
          <Card className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Configuration de votre solution</h2>
            
            <div className="space-y-6">
              {/* Score des leads */}
              <div className="space-y-2">
                <Label htmlFor="leadScore" className="text-sm font-medium text-gray-700">
                  Score des leads
                </Label>
                <Input
                  id="leadScore"
                  type="number"
                  placeholder="Entrez le score minimum (0-100)"
                  value={leadScore}
                  onChange={(e) => setLeadScore(e.target.value)}
                  className="w-full"
                  min="0"
                  max="100"
                />
                <p className="text-xs text-gray-500">
                  Définissez un score minimum pour qualifier vos leads (0 = score le plus bas, 100 = score le plus élevé)
                </p>
              </div>

              {/* Suivi automatique */}
              <div className="space-y-2">
                <Label htmlFor="automaticFollowUp" className="text-sm font-medium text-gray-700">
                  Suivi automatique
                </Label>
                <Textarea
                  id="automaticFollowUp"
                  placeholder="Décrivez votre stratégie de suivi automatique..."
                  value={automaticFollowUp}
                  onChange={(e) => setAutomaticFollowUp(e.target.value)}
                  className="w-full min-h-[100px]"
                />
                <p className="text-xs text-gray-500">
                  Définissez comment vous souhaitez automatiser le suivi de vos prospects (emails, rappels, etc.)
                </p>
              </div>

              {/* Informations supplémentaires */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-900 mb-2">Recommandations pour ce problème :</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Utilisez un score de lead entre 70-80 pour commencer</li>
                  <li>• Configurez des emails de suivi automatiques après 3, 7 et 14 jours</li>
                  <li>• Personnalisez vos messages en fonction du score du lead</li>
                </ul>
              </div>

              {/* Boutons d'action */}
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={handleBack}>
                  Retour
                </Button>
                <Button 
                  onClick={handleContinue}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={!leadScore || !automaticFollowUp}
                >
                  Continuer
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 mb-8">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mr-4">
              <Briefcase className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Agent IA Business</h1>
              <p className="text-gray-600 text-lg mt-1">
                Quel est le premier problème que vous aimeriez résoudre ?
              </p>
            </div>
          </div>
          <p className="text-gray-500 text-sm">
            Ne vous inquiétez pas si plusieurs options attirent votre attention - vous pourrez toutes les explorer plus tard.
          </p>
        </div>

        {/* Grille des problèmes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {problems.map((problem) => (
            <Card 
              key={problem.id}
              className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer group"
              onClick={() => handleProblemSelect(problem.id)}
            >
              <div className="flex items-start space-x-4">
                <div className={`w-12 h-12 ${problem.color} rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                  <problem.icon className={`w-6 h-6 ${problem.iconColor}`} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {problem.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {problem.description}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Footer avec navigation */}
        <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
          <Button variant="outline" disabled>
            Précédent
          </Button>
          <Button disabled className="bg-gray-300 text-gray-500">
            Continuer
          </Button>
        </div>
      </div>
    </div>
  );
};
