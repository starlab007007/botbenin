
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HelpCircle, Book, MessageCircle, Mail, Phone, Search, FileText, Video, ArrowRight, Presentation } from 'lucide-react';
import { DocumentationViewer } from '@/components/support/DocumentationViewer';
import { LiveChatSystem } from '@/components/support/LiveChatSystem';
import { VideoTutorials } from '@/components/support/VideoTutorials';
import { KnowledgeBase } from '@/components/support/KnowledgeBase';
import PlatformPresentation from '@/components/support/PlatformPresentation';

type SupportView = 'home' | 'documentation' | 'chat' | 'videos' | 'knowledge' | 'presentation';

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
    },
    {
      title: 'Présentation de la plateforme',
      description: "Découvrez l'unicité de Bot.Bj, ses spécialités et sa valeur ajoutée",
      icon: Presentation,
      color: 'bg-gradient-to-r from-pink-500 to-purple-600',
      action: 'Découvrir la plateforme',
      view: 'presentation' as SupportView,
      features: ['Vision complète', 'Avantages uniques', 'Flyers publicitaires', 'Témoignages clients']
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
      answer: "Dans votre workflow n8n, ajoutez un nœud webhook et configurez l'URL fournie par Bot.Bj. Consultez notre documentation complète pour les détails.",
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
      question: "Quels sont les différents types d'agents IA ?",
      answer: "Bot.Bj propose 4 types d'agents : Business (analyse de données), Marketing (campagnes automatisées), Gestion (processus RH) et Citoyen (services publics).",
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
      knowledge: <KnowledgeBase />,
      presentation: <PlatformPresentation />
    };
    
    return (
      <div className="min-h-screen bg-white">
        <div className="bg-white border-b border-gray-200 p-4">
          <Button 
            onClick={() => setCurrentView('home')}
            variant="outline" 
            className="text-black border-gray-300 bg-white hover:bg-gray-50"
          >
            ← Retour au support
          </Button>
        </div>
        {components[currentView]}
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 lg:space-y-8 bg-white min-h-screen">
      {/* Header */}
      <div className="text-center lg:text-left">
        <h1 className="text-3xl lg:text-4xl font-bold text-black mb-2">Centre d&apos;Aide Bot.Bj</h1>
        <p className="text-lg text-black">Toute l&apos;aide dont vous avez besoin pour maîtriser la plateforme</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {quickStats.map((stat, index) => (
          <Card key={index} className="bg-white border border-gray-200 p-4 text-center">
            <stat.icon className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-black">{stat.value}</div>
            <div className="text-sm text-black">{stat.label}</div>
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
            className="flex-1 text-black placeholder-gray-500 focus:outline-none text-lg border-none bg-transparent"
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
            <h2 className="text-xl font-semibold text-black mb-2">{option.title}</h2>
            <p className="text-black mb-4">{option.description}</p>
            
            <div className="space-y-2 mb-4">
              {option.features.map((feature, idx) => (
                <div key={idx} className="flex items-center text-sm text-black">
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
        <h2 className="text-2xl font-semibold text-black mb-6">Questions Fréquentes</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {faqs.map((faq, index) => (
            <Card key={index} className="p-6 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-black pr-2">{faq.question}</h3>
                <span className="px-3 py-1 bg-gray-100 text-black text-xs rounded-full font-medium whitespace-nowrap">
                  {faq.category}
                </span>
              </div>
              <p className="text-black leading-relaxed">{faq.answer}</p>
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
            <h2 className="text-2xl font-bold mb-2">Besoin d&apos;aide personnalisée ?</h2>
            <p className="text-blue-100">Notre équipe d&apos;experts est disponible 24/7 pour vous accompagner</p>
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
              +229 01 40 29 91 91
            </Button>
          </div>
        </div>
      </Card>

      {/* Success Stories */}
      <Card className="p-8 bg-white border border-gray-200 rounded-xl">
        <h2 className="text-2xl font-semibold text-black mb-6 text-center">Témoignages Clients</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🎯</span>
            </div>
            <h3 className="font-semibold text-black mb-2">+300% Efficacité</h3>
            <p className="text-black text-sm">Automatisation des processus métier</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚡</span>
            </div>
            <h3 className="font-semibold text-black mb-2">Temps de réponse &lt; 2min</h3>
            <p className="text-black text-sm">Support technique réactif</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🚀</span>
            </div>
            <h3 className="font-semibold text-black mb-2">ROI de 400%</h3>
            <p className="text-black text-sm">Retour sur investissement moyen</p>
          </div>
        </div>
      </Card>

      {/* Pricing Section */}
      <Card className="p-8 bg-white border border-gray-200 rounded-xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-black mb-2">🌟 Modèle Économique Bot.Bj</h2>
          <p className="text-black">Structure tarifaire adaptée à tous vos besoins</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Starter */}
          <div className="border border-gray-300 rounded-xl p-6 hover:shadow-lg transition-all duration-300">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-black mb-2">🔹 Starter</h3>
              <div className="text-2xl font-bold text-green-600 mb-1">Gratuit</div>
              <p className="text-sm text-gray-600">Petites entreprises</p>
            </div>
            
            <div className="space-y-3 mb-6">
              <div className="flex items-center text-sm">
                <span className="text-green-500 mr-2">✅</span>
                <span className="text-black">1 Agent IA</span>
              </div>
              <div className="flex items-center text-sm">
                <span className="text-green-500 mr-2">✅</span>
                <span className="text-black">1 000 messages/mois</span>
              </div>
              <div className="flex items-center text-sm">
                <span className="text-green-500 mr-2">✅</span>
                <span className="text-black">Support email</span>
              </div>
              <div className="flex items-center text-sm">
                <span className="text-green-500 mr-2">✅</span>
                <span className="text-black">Intégrations de base</span>
              </div>
              <div className="flex items-center text-sm">
                <span className="text-green-500 mr-2">✅</span>
                <span className="text-black">Tableau de bord analytique</span>
              </div>
              <div className="flex items-center text-sm">
                <span className="text-green-500 mr-2">✅</span>
                <span className="text-black">Suivi des statistiques en temps réel</span>
              </div>
              <div className="flex items-center text-sm">
                <span className="text-green-500 mr-2">✅</span>
                <span className="text-black">QR code de bot</span>
              </div>
              <div className="flex items-center text-sm">
                <span className="text-green-500 mr-2">✅</span>
                <span className="text-black">Partage sur les réseaux sociaux</span>
              </div>
              <div className="flex items-center text-sm">
                <span className="text-green-500 mr-2">✅</span>
                <span className="text-black">Lien webhook</span>
              </div>
              <div className="flex items-center text-sm">
                <span className="text-red-500 mr-2">❌</span>
                <span className="text-gray-500">Relances automatisées</span>
              </div>
              <div className="flex items-center text-sm">
                <span className="text-red-500 mr-2">❌</span>
                <span className="text-gray-500">Scoring des leads</span>
              </div>
              <div className="flex items-center text-sm">
                <span className="text-red-500 mr-2">❌</span>
                <span className="text-gray-500">Envois multicanaux</span>
              </div>
              <div className="flex items-center text-sm">
                <span className="text-red-500 mr-2">❌</span>
                <span className="text-gray-500">Prospection du marché</span>
              </div>
            </div>
            
            <Button className="w-full bg-gray-600 hover:bg-gray-700 text-white">
              Choisir ce plan
            </Button>
          </div>

          {/* Professional */}
          <div className="border-2 border-blue-500 rounded-xl p-6 hover:shadow-lg transition-all duration-300 relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-xs font-medium">Recommandé</span>
            </div>
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-black mb-2">🔹 Professional</h3>
              <div className="text-2xl font-bold text-blue-600 mb-1">7 500 CFA/mois</div>
              <p className="text-sm text-gray-600">PME / PMI</p>
            </div>
            
            <div className="space-y-3 mb-6">
              <div className="flex items-center text-sm">
                <span className="text-green-500 mr-2">✅</span>
                <span className="text-black">2 Agents IA</span>
              </div>
              <div className="flex items-center text-sm">
                <span className="text-green-500 mr-2">✅</span>
                <span className="text-black">10 000 messages/mois</span>
              </div>
              <div className="flex items-center text-sm">
                <span className="text-green-500 mr-2">✅</span>
                <span className="text-black">Génération de leads & qualification</span>
              </div>
              <div className="flex items-center text-sm">
                <span className="text-green-500 mr-2">✅</span>
                <span className="text-black">Relances automatisées</span>
              </div>
              <div className="flex items-center text-sm">
                <span className="text-green-500 mr-2">✅</span>
                <span className="text-black">Emails (5 000/mois)</span>
              </div>
              <div className="flex items-center text-sm">
                <span className="text-green-500 mr-2">✅</span>
                <span className="text-black">CRM de suivi des contacts</span>
              </div>
              <div className="flex items-center text-sm">
                <span className="text-green-500 mr-2">✅</span>
                <span className="text-black">Intégrations complètes</span>
              </div>
              <div className="flex items-center text-sm">
                <span className="text-green-500 mr-2">✅</span>
                <span className="text-black">Support prioritaire</span>
              </div>
              <div className="flex items-center text-sm">
                <span className="text-green-500 mr-2">✅</span>
                <span className="text-black">Lien de bot personnalisé</span>
              </div>
              <div className="flex items-center text-sm">
                <span className="text-green-500 mr-2">✅</span>
                <span className="text-black">Prospection automatisée</span>
              </div>
              <div className="flex items-center text-sm">
                <span className="text-green-500 mr-2">✅</span>
                <span className="text-black">Tableau de bord analytique</span>
              </div>
              <div className="flex items-center text-sm">
                <span className="text-green-500 mr-2">✅</span>
                <span className="text-black">Suivi des statistiques en temps réel</span>
              </div>
              <div className="flex items-center text-sm">
                <span className="text-green-500 mr-2">✅</span>
                <span className="text-black">QR code de bot</span>
              </div>
              <div className="flex items-center text-sm">
                <span className="text-green-500 mr-2">✅</span>
                <span className="text-black">Partage sur les réseaux sociaux</span>
              </div>
              <div className="flex items-center text-sm">
                <span className="text-green-500 mr-2">✅</span>
                <span className="text-black">Lien webhook</span>
              </div>
            </div>
            
            <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white">
              Choisir ce plan
            </Button>
          </div>

          {/* Enterprise */}
          <div className="border border-gray-300 rounded-xl p-6 hover:shadow-lg transition-all duration-300">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-black mb-2">🔹 Enterprise</h3>
              <div className="text-2xl font-bold text-purple-600 mb-1">15 500 CFA/mois</div>
              <p className="text-sm text-gray-600">Grandes entreprises</p>
            </div>
            
            <div className="space-y-3 mb-6">
              <div className="flex items-center text-sm">
                <span className="text-green-500 mr-2">✅</span>
                <span className="text-black">4 Agents IA</span>
              </div>
              <div className="flex items-center text-sm">
                <span className="text-green-500 mr-2">✅</span>
                <span className="text-black">Messages illimités</span>
              </div>
              <div className="flex items-center text-sm">
                <span className="text-green-500 mr-2">✅</span>
                <span className="text-black">Qualification dynamique + IA</span>
              </div>
              <div className="flex items-center text-sm">
                <span className="text-green-500 mr-2">✅</span>
                <span className="text-black">Relances automatiques + manuelles</span>
              </div>
              <div className="flex items-center text-sm">
                <span className="text-green-500 mr-2">✅</span>
                <span className="text-black">Emails/SMS/WhatsApp illimités</span>
              </div>
              <div className="flex items-center text-sm">
                <span className="text-green-500 mr-2">✅</span>
                <span className="text-black">Automatisation marketing + IA prédictive</span>
              </div>
              <div className="flex items-center text-sm">
                <span className="text-green-500 mr-2">✅</span>
                <span className="text-black">A/B Testing, scoring évolutif</span>
              </div>
              <div className="flex items-center text-sm">
                <span className="text-green-500 mr-2">✅</span>
                <span className="text-black">Personnalisation avancée</span>
              </div>
              <div className="flex items-center text-sm">
                <span className="text-green-500 mr-2">✅</span>
                <span className="text-black">Support dédié 24/7</span>
              </div>
              <div className="flex items-center text-sm">
                <span className="text-green-500 mr-2">✅</span>
                <span className="text-black">Prospection multicanal avec ciblage IA</span>
              </div>
              <div className="flex items-center text-sm">
                <span className="text-green-500 mr-2">✅</span>
                <span className="text-black">Tableau de bord analytique</span>
              </div>
              <div className="flex items-center text-sm">
                <span className="text-green-500 mr-2">✅</span>
                <span className="text-black">Suivi des statistiques en temps réel</span>
              </div>
              <div className="flex items-center text-sm">
                <span className="text-green-500 mr-2">✅</span>
                <span className="text-black">QR code de bot</span>
              </div>
              <div className="flex items-center text-sm">
                <span className="text-green-500 mr-2">✅</span>
                <span className="text-black">Partage sur les réseaux sociaux</span>
              </div>
              <div className="flex items-center text-sm">
                <span className="text-green-500 mr-2">✅</span>
                <span className="text-black">Lien webhook</span>
              </div>
            </div>
            
            <Button className="w-full bg-gray-600 hover:bg-gray-700 text-white">
              Choisir ce plan
            </Button>
          </div>

          {/* Custom */}
          <div className="border border-gray-300 rounded-xl p-6 hover:shadow-lg transition-all duration-300">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-black mb-2">🔹 Custom</h3>
              <div className="text-2xl font-bold text-orange-600 mb-1">Sur devis</div>
              <p className="text-sm text-gray-600">Secteur public & Corporate</p>
            </div>
            
            <div className="space-y-3 mb-6">
              <div className="flex items-center text-sm">
                <span className="text-green-500 mr-2">✅</span>
                <span className="text-black">Solution sur mesure</span>
              </div>
              <div className="flex items-center text-sm">
                <span className="text-green-500 mr-2">✅</span>
                <span className="text-black">Développements spécifiques</span>
              </div>
              <div className="flex items-center text-sm">
                <span className="text-green-500 mr-2">✅</span>
                <span className="text-black">SLA garanti</span>
              </div>
              <div className="flex items-center text-sm">
                <span className="text-green-500 mr-2">✅</span>
                <span className="text-black">Formation et onboarding complet</span>
              </div>
              <div className="flex items-center text-sm">
                <span className="text-green-500 mr-2">✅</span>
                <span className="text-black">Gestion multi-workspace</span>
              </div>
              <div className="flex items-center text-sm">
                <span className="text-green-500 mr-2">✅</span>
                <span className="text-black">Prospection & campagnes à la demande</span>
              </div>
              <div className="flex items-center text-sm">
                <span className="text-green-500 mr-2">✅</span>
                <span className="text-black">Tableau de bord analytique</span>
              </div>
              <div className="flex items-center text-sm">
                <span className="text-green-500 mr-2">✅</span>
                <span className="text-black">Suivi des statistiques en temps réel</span>
              </div>
              <div className="flex items-center text-sm">
                <span className="text-green-500 mr-2">✅</span>
                <span className="text-black">QR code de bot</span>
              </div>
              <div className="flex items-center text-sm">
                <span className="text-green-500 mr-2">✅</span>
                <span className="text-black">Partage sur les réseaux sociaux</span>
              </div>
              <div className="flex items-center text-sm">
                <span className="text-green-500 mr-2">✅</span>
                <span className="text-black">Lien webhook</span>
              </div>
            </div>
            
            <Button className="w-full bg-gray-600 hover:bg-gray-700 text-white">
              Choisir ce plan
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
