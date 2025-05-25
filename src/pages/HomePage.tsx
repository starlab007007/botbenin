
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bot, Zap, Brain, Users, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Bot,
      title: 'Agents IA Spécialisés',
      description: 'Business, Marketing, Gestion et services citoyens automatisés',
      color: 'bg-blue-500'
    },
    {
      icon: Zap,
      title: 'Automatisation n8n',
      description: 'Workflows intelligents et processus métiers automatisés',
      color: 'bg-green-500'
    },
    {
      icon: Brain,
      title: 'Interface Conversationnelle',
      description: 'Interaction naturelle pour toutes vos opérations',
      color: 'bg-purple-500'
    },
    {
      icon: Users,
      title: 'Multi-utilisateurs',
      description: 'Gestion des rôles et permissions avancées',
      color: 'bg-orange-500'
    }
  ];

  const aiAgents = [
    {
      title: 'Agent IA Business',
      description: 'CRM, leads, génération de documents, analyse prédictive',
      path: '/modules/business',
      color: 'from-blue-600 to-blue-700'
    },
    {
      title: 'Agent IA Marketing',
      description: 'Campagnes multicanales, segmentation, analyse des performances',
      path: '/modules/marketing',
      color: 'from-green-600 to-green-700'
    },
    {
      title: 'Agent IA Gestion',
      description: 'Workflows visuels, automatisation des flux métiers',
      path: '/modules/gestion',
      color: 'from-purple-600 to-purple-700'
    },
    {
      title: 'IA Citoyen',
      description: 'Services publics, recherche emploi, démarches administratives',
      path: '/modules/citoyen',
      color: 'from-orange-600 to-orange-700'
    }
  ];

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <Bot className="w-16 h-16 text-green-400 mr-4" />
            <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent">
              Bot.Bj
            </h1>
          </div>
          <p className="text-2xl text-slate-300 mb-8 max-w-4xl mx-auto">
            Plateforme web <span className="text-green-400 font-semibold">immersive & intelligente</span> pour 
            <span className="text-blue-400 font-semibold"> automatiser les processus métiers</span> via des 
            <span className="text-purple-400 font-semibold"> agents IA conversationnels spécialisés</span>
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button 
              onClick={() => navigate('/chat')}
              className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white px-8 py-4 text-lg font-semibold rounded-full shadow-lg"
            >
              Démarrer une conversation
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button 
              onClick={() => navigate('/modules/business')}
              variant="outline"
              className="border-green-400 text-green-400 hover:bg-green-400 hover:text-slate-900 px-8 py-4 text-lg font-semibold rounded-full"
            >
              Explorer les agents IA
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {features.map((feature, index) => (
            <Card key={index} className="bg-slate-800/50 border-slate-700 p-6 hover:bg-slate-800/70 transition-colors">
              <div className={`w-12 h-12 ${feature.color} rounded-lg flex items-center justify-center mb-4`}>
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-slate-400">{feature.description}</p>
            </Card>
          ))}
        </div>

        {/* AI Agents Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-white mb-12">
            Agents IA Spécialisés
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {aiAgents.map((agent, index) => (
              <Card 
                key={index} 
                className={`bg-gradient-to-r ${agent.color} border-0 p-6 cursor-pointer hover:scale-105 transition-transform`}
                onClick={() => navigate(agent.path)}
              >
                <h3 className="text-xl font-semibold text-white mb-3">{agent.title}</h3>
                <p className="text-slate-100 mb-4">{agent.description}</p>
                <Button 
                  variant="secondary" 
                  className="bg-white/20 hover:bg-white/30 text-white border-0"
                >
                  Accéder au module
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Card>
            ))}
          </div>
        </div>

        {/* Statistics */}
        <div className="bg-slate-800/30 rounded-2xl p-8 mb-16">
          <h2 className="text-2xl font-bold text-center text-white mb-8">
            Optimisez votre productivité
          </h2>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-green-400 mb-2">24/7</div>
              <p className="text-slate-300">Assistant virtuel disponible</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-400 mb-2">+400</div>
              <p className="text-slate-300">Intégrations natives n8n</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-purple-400 mb-2">100%</div>
              <p className="text-slate-300">Workflows personnalisables</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
