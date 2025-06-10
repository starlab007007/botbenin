
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { 
  Bot, 
  MessageCircle, 
  Briefcase, 
  Megaphone, 
  FolderOpen, 
  Users, 
  BarChart3, 
  Workflow,
  Database,
  ArrowRight,
  Star,
  Zap,
  Shield
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const features = [
    {
      icon: MessageCircle,
      title: 'Chat IA Avancé',
      description: 'Conversez avec des assistants IA spécialisés',
      path: '/chat',
      color: 'bg-green-100 text-green-600',
      requireAuth: true
    },
    {
      icon: Briefcase,
      title: 'Agent IA Business',
      description: 'Ciblage B2B et prospection intelligente',
      path: '/modules/business',
      color: 'bg-blue-100 text-blue-600',
      requireAuth: true
    },
    {
      icon: Megaphone,
      title: 'Agent IA Marketing',
      description: 'Campagnes et automatisation marketing',
      path: '/modules/marketing',
      color: 'bg-pink-100 text-pink-600',
      requireAuth: true
    },
    {
      icon: FolderOpen,
      title: 'Agent IA Gestion',
      description: 'Gestion documentaire et administrative',
      path: '/modules/gestion',
      color: 'bg-indigo-100 text-indigo-600',
      requireAuth: true
    },
    {
      icon: Users,
      title: 'IA Citoyen',
      description: 'Assistant pour démarches citoyennes',
      path: '/modules/citoyen',
      color: 'bg-teal-100 text-teal-600',
      requireAuth: true
    },
    {
      icon: Database,
      title: 'Gestion Prospects',
      description: 'Base de données et suivi clients',
      path: '/prospects',
      color: 'bg-cyan-100 text-cyan-600',
      requireAuth: true
    }
  ];

  const stats = [
    { label: 'Modules IA', value: '5+', icon: Bot },
    { label: 'Utilisateurs Actifs', value: '10K+', icon: Users },
    { label: 'Automatisations', value: '500+', icon: Workflow },
    { label: 'Entreprises', value: '1K+', icon: Briefcase }
  ];

  const handleFeatureClick = (path: string, requireAuth: boolean) => {
    if (requireAuth && !isAuthenticated) {
      navigate('/auth');
    } else {
      navigate(path);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="flex justify-center items-center mb-6">
            <div className="p-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full">
              <Bot className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Plateforme IA <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Bot.Bj</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Révolutionnez votre activité avec nos agents IA spécialisés. 
            Business, Marketing, Gestion et Services Citoyens - Tout dans une seule plateforme.
          </p>
          
          {!isAuthenticated ? (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                onClick={() => navigate('/auth')}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3"
              >
                Commencer Gratuitement
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => navigate('/support')}
                className="px-8 py-3"
              >
                En savoir plus
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-lg text-gray-700">
                Bon retour, <strong>{user?.name}</strong> ! 
                <Badge className="ml-2 bg-green-100 text-green-800">{user?.role}</Badge>
              </p>
              <Button 
                size="lg" 
                onClick={() => navigate('/dashboard')}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3"
              >
                Accéder au Tableau de Bord
                <BarChart3 className="w-5 h-5 ml-2" />
              </Button>
            </div>
          )}
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          {stats.map((stat, index) => (
            <Card key={index} className="p-6 text-center bg-white/80 backdrop-blur-sm border-gray-200 hover:shadow-lg transition-shadow">
              <stat.icon className="w-8 h-8 mx-auto mb-2 text-blue-600" />
              <div className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</div>
              <div className="text-sm text-gray-600">{stat.label}</div>
            </Card>
          ))}
        </div>

        {/* Features Grid */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-2">
            Modules IA Disponibles
          </h2>
          <p className="text-center text-gray-600 mb-12">
            Découvrez nos assistants IA spécialisés pour chaque domaine
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card 
                key={index}
                className="p-6 bg-white/80 backdrop-blur-sm border-gray-200 hover:shadow-xl transition-all duration-300 cursor-pointer group"
                onClick={() => handleFeatureClick(feature.path, feature.requireAuth)}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg ${feature.color}`}>
                    <feature.icon className="w-6 h-6" />
                  </div>
                  {feature.requireAuth && !isAuthenticated && (
                    <Badge variant="outline" className="text-xs">Connexion requise</Badge>
                  )}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-600 mb-4">{feature.description}</p>
                <div className="flex items-center text-blue-600 text-sm font-medium group-hover:translate-x-1 transition-transform">
                  Découvrir
                  <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Benefits Section */}
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Pourquoi Choisir Bot.Bj ?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="p-4 bg-yellow-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-yellow-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">IA Avancée</h3>
              <p className="text-gray-600">
                Technologie d'intelligence artificielle de pointe pour des résultats optimaux
              </p>
            </div>
            <div className="text-center">
              <div className="p-4 bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Sécurisé</h3>
              <p className="text-gray-600">
                Sécurité renforcée et conformité RGPD pour protéger vos données
              </p>
            </div>
            <div className="text-center">
              <div className="p-4 bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Qualité</h3>
              <p className="text-gray-600">
                Interface intuitive et support client réactif pour une expérience optimale
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        {!isAuthenticated && (
          <div className="text-center bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
            <h2 className="text-3xl font-bold mb-4">Prêt à Commencer ?</h2>
            <p className="text-xl mb-6 opacity-90">
              Rejoignez des milliers d'utilisateurs qui font confiance à Bot.Bj
            </p>
            <Button 
              size="lg"
              onClick={() => navigate('/auth')}
              className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3"
            >
              Créer un Compte Gratuit
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
