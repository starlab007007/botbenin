
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Bell, 
  Shield, 
  Database, 
  Mail, 
  MessageSquare,
  Save,
  RefreshCw
} from 'lucide-react';

export const SystemSettings: React.FC = () => {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [userRegistration, setUserRegistration] = useState(true);
  const [publicBotAccess, setPublicBotAccess] = useState(true);

  const settingsSections = [
    {
      title: 'Paramètres Généraux',
      icon: Settings,
      settings: [
        {
          label: 'Mode Maintenance',
          description: 'Activer le mode maintenance pour la plateforme',
          type: 'switch',
          value: maintenanceMode,
          onChange: setMaintenanceMode,
        },
        {
          label: 'Enregistrement des Utilisateurs',
          description: 'Permettre aux nouveaux utilisateurs de s\'inscrire',
          type: 'switch',
          value: userRegistration,
          onChange: setUserRegistration,
        },
        {
          label: 'Accès Public aux Bots',
          description: 'Permettre l\'accès public aux bots partagés',
          type: 'switch',
          value: publicBotAccess,
          onChange: setPublicBotAccess,
        },
      ],
    },
    {
      title: 'Notifications',
      icon: Bell,
      settings: [
        {
          label: 'Notifications Email',
          description: 'Envoyer des notifications par email aux utilisateurs',
          type: 'switch',
          value: emailNotifications,
          onChange: setEmailNotifications,
        },
      ],
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Paramètres Système</h1>
          <p className="text-gray-600 mt-1">Configuration globale de la plateforme</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Recharger
          </Button>
          <Button>
            <Save className="w-4 h-4 mr-2" />
            Sauvegarder
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {settingsSections.map((section, index) => (
          <Card key={index} className="p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-blue-50 rounded-lg">
                <section.icon className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
            </div>

            <div className="space-y-6">
              {section.settings.map((setting, settingIndex) => (
                <div key={settingIndex} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium text-gray-900">{setting.label}</span>
                      {setting.value && (
                        <Badge variant="outline" className="bg-green-50 text-green-600">
                          Activé
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{setting.description}</p>
                  </div>
                  <div className="ml-4">
                    {setting.type === 'switch' && (
                      <Switch
                        checked={setting.value as boolean}
                        onCheckedChange={setting.onChange as (checked: boolean) => void}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}

        <Card className="p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Database className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Maintenance Base de Données</h3>
          </div>

          <div className="space-y-4">
            <Button variant="outline" className="w-full justify-start">
              <RefreshCw className="w-4 h-4 mr-2" />
              Nettoyer les sessions expirées
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Database className="w-4 h-4 mr-2" />
              Optimiser les index
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Shield className="w-4 h-4 mr-2" />
              Vérifier l'intégrité des données
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-green-50 rounded-lg">
              <Mail className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Configuration Email</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Serveur SMTP
              </label>
              <Input placeholder="smtp.example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email de l'expéditeur
              </label>
              <Input placeholder="noreply@example.com" />
            </div>
            <Button variant="outline" className="w-full">
              <Mail className="w-4 h-4 mr-2" />
              Tester la Configuration
            </Button>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-orange-50 rounded-lg">
            <MessageSquare className="w-5 h-5 text-orange-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Message de Maintenance</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Titre du Message
            </label>
            <Input 
              placeholder="Maintenance en cours..." 
              defaultValue="Maintenance Programmée"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <Textarea 
              placeholder="Décrivez la raison de la maintenance..."
              defaultValue="Notre plateforme est temporairement indisponible pour maintenance. Nous serons de retour très bientôt."
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Temps Estimé de Retour
            </label>
            <Input type="datetime-local" />
          </div>
        </div>
      </Card>
    </div>
  );
};
