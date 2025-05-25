
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Settings, CreditCard, Shield, Bell, Palette, Lock, Mail } from 'lucide-react';

export const AccountPage: React.FC = () => {
  const accountSections = [
    {
      title: 'Profil utilisateur',
      icon: User,
      color: 'bg-blue-500',
      content: (
        <div className="space-y-4">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
              U
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Utilisateur Bot.Bj</h3>
              <p className="text-gray-600">user@bot.bj</p>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="text-gray-600 text-sm">Nom complet</label>
              <p className="text-gray-900 font-semibold">Utilisateur Bot.Bj</p>
            </div>
            <div>
              <label className="text-gray-600 text-sm">Email</label>
              <p className="text-gray-900 font-semibold">user@bot.bj</p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Abonnement',
      icon: CreditCard,
      color: 'bg-green-500',
      content: (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-200">
            <div>
              <h4 className="font-semibold text-green-900">Plan Professionnel</h4>
              <p className="text-green-700 text-sm">Accès complet à tous les modules IA</p>
            </div>
            <div className="text-green-600 font-bold text-xl">€49/mois</div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="text-gray-600 text-sm">Statut</label>
              <p className="text-gray-900 font-semibold">Actif</p>
            </div>
            <div>
              <label className="text-gray-600 text-sm">Renouvellement</label>
              <p className="text-gray-900 font-semibold">15 juin 2025</p>
            </div>
          </div>
        </div>
      )
    }
  ];

  const settingsOptions = [
    { title: 'Notifications email', status: 'Activé', icon: Bell, color: 'bg-purple-500' },
    { title: 'Mode sombre', status: 'Activé', icon: Palette, color: 'bg-indigo-500' },
    { title: 'Authentification 2FA', status: 'Configuré', icon: Lock, color: 'bg-red-500' },
    { title: 'Langue', status: 'Français', icon: Settings, color: 'bg-orange-500' }
  ];

  return (
    <div className="p-4 lg:p-8 space-y-6 lg:space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Mon Compte</h1>
        <p className="text-gray-600">Gérez votre profil et vos paramètres</p>
      </div>

      {/* Account Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {accountSections.map((section, index) => (
          <Card key={index} className="p-6 border border-gray-100">
            <div className="flex items-center mb-6">
              <div className={`w-12 h-12 ${section.color} rounded-xl flex items-center justify-center shadow-md mr-4`}>
                <section.icon className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">{section.title}</h2>
            </div>
            {section.content}
            <Button className={`${section.color} hover:opacity-90 text-white mt-6 w-full lg:w-auto`}>
              {section.title === 'Profil utilisateur' ? 'Modifier le profil' : 'Gérer l\'abonnement'}
            </Button>
          </Card>
        ))}
      </div>

      {/* Settings Grid */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Préférences</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          {settingsOptions.map((option, index) => (
            <Card key={index} className="p-4 lg:p-6 border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 ${option.color} rounded-lg flex items-center justify-center`}>
                    <option.icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-gray-900 font-medium">{option.title}</span>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full font-medium">
                  {option.status}
                </span>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Security Section */}
      <Card className="p-6 lg:p-8 border border-gray-100">
        <div className="flex items-center mb-6">
          <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center shadow-md mr-4">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Sécurité</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Button className="bg-red-500 hover:bg-red-600 text-white">
            <Lock className="w-4 h-4 mr-2" />
            Changer le mot de passe
          </Button>
          <Button variant="outline" className="border-gray-300 hover:bg-gray-50">
            <Mail className="w-4 h-4 mr-2" />
            Configurer 2FA
          </Button>
        </div>
      </Card>
    </div>
  );
};
