
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HelpCircle, Book, MessageCircle, Mail, Phone, Search, FileText, Video, ArrowRight } from 'lucide-react';
import { DocumentationViewer } from '@/components/support/DocumentationViewer';
import { LiveChatSystem } from '@/components/support/LiveChatSystem';
import { VideoTutorials } from '@/components/support/VideoTutorials';
import { KnowledgeBase } from '@/components/support/KnowledgeBase';

type SupportView = 'home' | 'documentation' | 'chat' | 'videos' | 'knowledge';

export const SupportPage: React.FC = () => {
  const [currentView, setCurrentView] = useState<SupportView>('home');

  const supportOptions = [
    {
      title: 'Documentation',
      description: 'Guides complets et tutoriels détaillés pour maîtriser toutes les fonctionnalités de Bot.Bj',
      icon: Book,
      color: 'bg-blue-500',
      action: 'Consulter les docs',
      view: 'documentation' as SupportView,
      features: ['Guides étape par étape', 'Configuration complète', 'Exemples pratiques', 'Mises à jour régulières']
    },
    {
      title: 'Chat en direct',
      description: 'Support instantané 24/7 avec nos experts techniques et consultants business',
      icon: MessageCircle,
      color: 'bg-green-500',
      action: 'Démarrer un chat',
      view: 'chat' as SupportView,
      features: ['Support 24/7', 'Experts spécialisés', 'Résolution rapide', 'Plusieurs langues']
    },
    {
      title: 'Vidéos tutoriels',
      description: 'Apprenez visuellement avec nos guides vidéo complets et interactifs',
      icon: Video,
      color: 'bg-purple-500',
      action: 'Voir les vidéos',
      view: 'videos' as SupportView,
      features: ['Tutoriels HD', 'Tous niveaux', 'Mise à jour continue', 'Téléchargement offline']
    },
    {
      title: 'Base de connaissances',
      description: 'Articles détaillés et solutions courantes pour tous vos besoins',
      icon: FileText,
      color: 'bg-orange-500',
      action: 'Parcourir les articles',
      view: 'knowledge' as SupportView,
      features: ['Articles détaillés', 'Solutions pratiques', 'Recherche avancée', 'Évaluations utilisateurs']
    }
  ];

  const quickStats = [
    { label: 'Articles disponibles', value: '150+', icon: FileText },
    { label: 'Vidéos tutoriels', value: '50+', icon: Video },
    { label: 'Temps de réponse moyen', value: '< 2min', icon: MessageCircle },
    { label: 'Satisfaction client', value: '98%', icon: HelpCircle }
  ];

  const faqs = [
    {
      question: 'Comment créer un nouveau workflow ?',
      answer: 'Rendez-vous dans la section Automatisations et cliquez sur "Nouvelle automatisation". Suivez notre guide étape par étape pour configurer votre premier workflow.',
      category: 'Workflows'
    },
    {
      question: 'Comment configurer les webhooks n8n ?',
      answer: 'Dans votre workflow n8n, ajoutez un nœud webhook et configurez l\'URL fournie par Bot.Bj. Consultez notre documentation complète pour les détails.',
      category: 'Intégrations'
    },
    {
      question: 'Puis-je intégrer mes propres API ?',
      answer: 'Oui, via les workflows n8n vous pouvez connecter plus de 400 services et API. Utilisez le nœud HTTP Request pour vos APIs personnalisées.',
      category: 'API'
    },
    {
      question: 'Comment gérer les utilisateurs ?',
      answer: 'Accédez aux paramètres de compte pour inviter des utilisateurs et gérer les permissions. Définissez des rôles spécifiques selon vos besoins.',
      category: 'Utilisateurs'
    },
    {
      question: 'Quels sont les différents types d\'agents IA ?',
      answer: 'Bot.Bj propose 4 types d\'agents : Business (analyse de données), Marketing (campagnes automatisées), Gestion (processus RH) et Citoyen (services publics).',
      category: 'Agents IA'
    },
    {
      question: 'Comment optimiser les performances de mon chatbot ?',
      answer: 'Optimisez vos prompts, utilisez le cache intelligent, surveillez les métriques de performance et ajustez la configuration selon les analytics.',
      category: 'Performance'
    }
  ];

  // Si on n'est pas sur la vue home, afficher le composant correspondant
  if (currentView !== 'home') {
    const components = {
      documentation: <DocumentationViewer />,
      chat: <LiveChatSystem />,
      videos: <VideoTutorials />,
      knowledge: <KnowledgeBase />
    };
    
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 p-4">
          <Button 
            onClick={() => setCurrentView('home')}
            variant="outline" 
            className="text-gray-700 border-gray-300"
          >
            ← Retour au support
          </Button>
        </div>
        {components[currentView]}
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 lg:space-y-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="text-center lg:text-left">
        <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">Centre d'Aide Bot.Bj</h1>
        <p className="text-lg text-gray-600">Toute l'aide dont vous avez besoin pour maîtriser la plateforme</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {quickStats.map((stat, index) => (
          <Card key={index} className="bg-white border border-gray-200 p-4 text-center">
            <stat.icon className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-sm text-gray-600">{stat.label}</div>
          </Card>
        ))}
      </div>

      {/* Search Bar */}
      <Card className="p-6 bg-white border border-gray-200 rounded-xl">
        <div className="flex items-center space-x-4">
          <Search className="w-6 h-6 text-gray-400" />
          <input
            type="text"
            placeholder="Que cherchez-vous ? (ex: créer un chatbot, configurer webhook...)"
            className="flex-1 text-gray-900 placeholder-gray-500 focus:outline-none text-lg border-none bg-transparent"
          />
          <Button className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2">
            Rechercher
          </Button>
        </div>
      </Card>

      {/* Support Options */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {supportOptions.map((option, index) => (
          <Card key={index} className="p-6 hover:shadow-lg transition-all duration-200 cursor-pointer bg-white border border-gray-200 rounded-xl group">
            <div className={`w-14 h-14 ${option.color} rounded-xl flex items-center justify-center mb-4 shadow-sm group-hover:shadow-md transition-shadow`}>
              <option.icon className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{option.title}</h2>
            <p className="text-gray-600 mb-4">{option.description}</p>
            
            <div className="space-y-2 mb-4">
              {option.features.map((feature, idx) => (
                <div key={idx} className="flex items-center text-sm text-gray-600">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></div>
                  {feature}
                </div>
              ))}
            </div>
            
            <Button 
              onClick={() => setCurrentView(option.view)}
              className={`${option.color} hover:opacity-90 text-white w-full group-hover:shadow-md transition-all`}
            >
              {option.action}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Card>
        ))}
      </div>

      {/* FAQ Section */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Questions Fréquentes</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {faqs.map((faq, index) => (
            <Card key={index} className="p-6 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-gray-900 pr-2">{faq.question}</h3>
                <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-medium whitespace-nowrap">
                  {faq.category}
                </span>
              </div>
              <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
              <Button 
                variant="ghost" 
                size="sm" 
                className="mt-3 text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-0"
              >
                En savoir plus →
              </Button>
            </Card>
          ))}
        </div>
      </div>

      {/* Contact Section */}
      <Card className="p-8 bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0 rounded-xl">
        <div className="text-center lg:text-left lg:flex lg:items-center lg:justify-between">
          <div className="mb-6 lg:mb-0">
            <h2 className="text-2xl font-bold mb-2">Besoin d'aide personnalisée ?</h2>
            <p className="text-blue-100">Notre équipe d'experts est disponible 24/7 pour vous accompagner</p>
            <div className="mt-4 text-sm text-blue-100">
              <div>• Support technique spécialisé</div>
              <div>• Consultation stratégique</div>
              <div>• Formation personnalisée</div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              onClick={() => setCurrentView('chat')}
              className="bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-sm"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Chat en direct
            </Button>
            <Button className="bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-sm">
              <Mail className="w-4 h-4 mr-2" />
              support@bot.bj
            </Button>
            <Button className="bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-sm">
              <Phone className="w-4 h-4 mr-2" />
              +33 1 23 45 67 89
            </Button>
          </div>
        </div>
      </Card>

      {/* Success Stories */}
      <Card className="p-8 bg-white border border-gray-200 rounded-xl">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">Témoignages Clients</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🎯</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">+300% Efficacité</h3>
            <p className="text-gray-600 text-sm">Automatisation des processus métier</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚡</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Temps de réponse < 2min</h3>
            <p className="text-gray-600 text-sm">Support technique réactif</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🚀</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">ROI de 400%</h3>
            <p className="text-gray-600 text-sm">Retour sur investissement moyen</p>
          </div>
        </div>
      </Card>
    </div>
  );
};
