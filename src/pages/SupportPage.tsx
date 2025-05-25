
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HelpCircle, Book, MessageCircle, Mail } from 'lucide-react';

export const SupportPage: React.FC = () => {
  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Aide / Support</h1>
          <p className="text-slate-300">Trouvez des réponses et obtenez de l'aide</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-blue-600 to-blue-700 border-0 p-6">
            <Book className="w-8 h-8 text-white mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Documentation</h2>
            <p className="text-blue-100 mb-4">Guides complets et tutoriels</p>
            <Button className="bg-white/20 hover:bg-white/30 text-white">
              Consulter les docs
            </Button>
          </Card>

          <Card className="bg-gradient-to-r from-green-600 to-green-700 border-0 p-6">
            <MessageCircle className="w-8 h-8 text-white mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Chat en direct</h2>
            <p className="text-green-100 mb-4">Support instantané 24/7</p>
            <Button className="bg-white/20 hover:bg-white/30 text-white">
              Démarrer un chat
            </Button>
          </Card>
        </div>

        <Card className="bg-slate-800/50 border-slate-700 p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Questions fréquentes</h2>
          <div className="space-y-4">
            <div className="border-l-4 border-blue-400 pl-4">
              <h3 className="font-semibold text-white mb-2">Comment créer un nouveau workflow ?</h3>
              <p className="text-slate-300">Rendez-vous dans la section Automatisations et cliquez sur "Nouvelle automatisation".</p>
            </div>
            <div className="border-l-4 border-green-400 pl-4">
              <h3 className="font-semibold text-white mb-2">Comment configurer les webhooks n8n ?</h3>
              <p className="text-slate-300">Dans votre workflow n8n, ajoutez un nœud webhook et configurez l'URL fournie par Bot.Bj.</p>
            </div>
            <div className="border-l-4 border-purple-400 pl-4">
              <h3 className="font-semibold text-white mb-2">Puis-je intégrer mes propres API ?</h3>
              <p className="text-slate-300">Oui, via les workflows n8n vous pouvez connecter plus de 400 services et API.</p>
            </div>
          </div>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Nous contacter</h2>
          <div className="flex items-center space-x-4">
            <Button className="bg-orange-600 hover:bg-orange-700">
              <Mail className="w-4 h-4 mr-2" />
              support@bot.bj
            </Button>
            <Button variant="outline" className="border-slate-600 text-slate-300">
              <HelpCircle className="w-4 h-4 mr-2" />
              Centre d'aide
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
