
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Settings, CreditCard, Shield } from 'lucide-react';

export const AccountPage: React.FC = () => {
  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Mon Compte</h1>
          <p className="text-slate-300">Gérez votre profil et vos paramètres</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="bg-slate-800/50 border-slate-700 p-6">
            <div className="flex items-center mb-4">
              <User className="w-6 h-6 text-blue-400 mr-3" />
              <h2 className="text-xl font-semibold text-white">Profil utilisateur</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-slate-300 text-sm">Nom complet</label>
                <p className="text-white font-semibold">Utilisateur Bot.Bj</p>
              </div>
              <div>
                <label className="text-slate-300 text-sm">Email</label>
                <p className="text-white font-semibold">user@bot.bj</p>
              </div>
              <Button className="bg-blue-600 hover:bg-blue-700">
                Modifier le profil
              </Button>
            </div>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 p-6">
            <div className="flex items-center mb-4">
              <CreditCard className="w-6 h-6 text-green-400 mr-3" />
              <h2 className="text-xl font-semibold text-white">Abonnement</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-slate-300 text-sm">Plan actuel</label>
                <p className="text-white font-semibold">Professionnel</p>
              </div>
              <div>
                <label className="text-slate-300 text-sm">Renouvellement</label>
                <p className="text-white font-semibold">15 juin 2025</p>
              </div>
              <Button className="bg-green-600 hover:bg-green-700">
                Gérer l'abonnement
              </Button>
            </div>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 p-6">
            <div className="flex items-center mb-4">
              <Settings className="w-6 h-6 text-purple-400 mr-3" />
              <h2 className="text-xl font-semibold text-white">Préférences</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Notifications email</span>
                <Button variant="outline" size="sm" className="border-slate-600">
                  Activé
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Mode sombre</span>
                <Button variant="outline" size="sm" className="border-slate-600">
                  Activé
                </Button>
              </div>
            </div>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 p-6">
            <div className="flex items-center mb-4">
              <Shield className="w-6 h-6 text-orange-400 mr-3" />
              <h2 className="text-xl font-semibold text-white">Sécurité</h2>
            </div>
            <div className="space-y-4">
              <Button className="bg-orange-600 hover:bg-orange-700 w-full">
                Changer le mot de passe
              </Button>
              <Button variant="outline" className="border-slate-600 w-full">
                Configurer 2FA
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
