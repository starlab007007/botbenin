
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HelpCircle, Book, MessageCircle, Mail, Phone, Search, FileText, Video } from 'lucide-react';

export const SupportPage: React.FC = () => {
  const supportOptions = [
    {
      title: 'Documentation',
      description: 'Guides complets et tutoriels',
      icon: Book,
      color: 'bg-blue-500',
      action: 'Consulter les docs'
    },
    {
      title: 'Chat en direct',
      description: 'Support instantané 24/7',
      icon: MessageCircle,
      color: 'bg-green-500',
      action: 'Démarrer un chat'
    },
    {
      title: 'Vidéos tutoriels',
      description: 'Apprenez avec nos guides vidéo',
      icon: Video,
      color: 'bg-purple-500',
      action: 'Voir les vidéos'
    },
    {
      title: 'Base de connaissances',
      description: 'Articles et solutions courantes',
      icon: FileText,
      color: 'bg-orange-500',
      action: 'Parcourir les articles'
    }
  ];

  const faqs = [
    {
      question: 'Comment créer un nouveau workflow ?',
      answer: 'Rendez-vous dans la section Automatisations et cliquez sur "Nouvelle automatisation".',
      category: 'Workflows',
      color: 'border-blue-400'
    },
    {
      question: 'Comment configurer les webhooks n8n ?',
      answer: 'Dans votre workflow n8n, ajoutez un nœud webhook et configurez l\'URL fournie par Bot.Bj.',
      category: 'Intégrations',
      color: 'border-green-400'
    },
    {
      question: 'Puis-je intégrer mes propres API ?',
      answer: 'Oui, via les workflows n8n vous pouvez connecter plus de 400 services et API.',
      category: 'API',
      color: 'border-purple-400'
    },
    {
      question: 'Comment gérer les utilisateurs ?',
      answer: 'Accédez aux paramètres de compte pour inviter des utilisateurs et gérer les permissions.',
      category: 'Utilisateurs',
      color: 'border-orange-400'
    }
  ];

  return (
    <div className="p-4 lg:p-8 space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="text-center lg:text-left">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Aide / Support</h1>
        <p className="text-gray-600">Trouvez des réponses et obtenez de l'aide</p>
      </div>

      {/* Search Bar */}
      <Card className="p-4 lg:p-6 border border-gray-100">
        <div className="flex items-center space-x-4">
          <Search className="w-6 h-6 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher dans l'aide..."
            className="flex-1 text-gray-900 placeholder-gray-500 focus:outline-none text-base lg:text-lg"
          />
          <Button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 lg:px-6">
            Rechercher
          </Button>
        </div>
      </Card>

      {/* Support Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {supportOptions.map((option, index) => (
          <Card key={index} className="p-4 lg:p-6 hover:shadow-lg transition-all duration-200 cursor-pointer border border-gray-100">
            <div className={`w-12 h-12 lg:w-14 lg:h-14 ${option.color} rounded-xl flex items-center justify-center mb-4 shadow-md`}>
              <option.icon className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
            </div>
            <h2 className="text-lg lg:text-xl font-semibold text-gray-900 mb-2">{option.title}</h2>
            <p className="text-gray-600 text-sm lg:text-base mb-4">{option.description}</p>
            <Button className={`${option.color} hover:opacity-90 text-white w-full text-sm lg:text-base`}>
              {option.action}
            </Button>
          </Card>
        ))}
      </div>

      {/* FAQ Section */}
      <div>
        <h2 className="text-xl lg:text-2xl font-semibold text-gray-900 mb-6">Questions fréquentes</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          {faqs.map((faq, index) => (
            <Card key={index} className={`p-4 lg:p-6 border-l-4 ${faq.color} border-t border-r border-b border-gray-100 hover:shadow-md transition-shadow`}>
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-gray-900 text-sm lg:text-base">{faq.question}</h3>
                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-medium ml-2">
                  {faq.category}
                </span>
              </div>
              <p className="text-gray-600 text-sm lg:text-base">{faq.answer}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Contact Section */}
      <Card className="p-6 lg:p-8 bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0">
        <div className="text-center lg:text-left lg:flex lg:items-center lg:justify-between">
          <div className="mb-6 lg:mb-0">
            <h2 className="text-xl lg:text-2xl font-bold mb-2">Besoin d'aide supplémentaire ?</h2>
            <p className="text-blue-100 text-sm lg:text-base">Notre équipe est là pour vous accompagner</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 lg:gap-4">
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
    </div>
  );
};
