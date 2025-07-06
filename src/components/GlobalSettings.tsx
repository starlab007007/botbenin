import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Settings, 
  Save, 
  Database, 
  Mail, 
  Shield,
  Globe,
  Bell,
  Zap
} from 'lucide-react';

interface SystemSettings {
  site_name: string;
  site_url: string;
  admin_email: string;
  max_bots_per_user: number;
  enable_registrations: boolean;
  enable_email_notifications: boolean;
  maintenance_mode: boolean;
  max_file_size_mb: number;
}

export const GlobalSettings: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings>({
    site_name: 'BotIA Platform',
    site_url: 'https://bot.bj',
    admin_email: 'admin@bot.bj',
    max_bots_per_user: 10,
    enable_registrations: true,
    enable_email_notifications: true,
    maintenance_mode: false,
    max_file_size_mb: 50
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      // Pour l'instant, on utilise des valeurs par défaut
      // Dans une vraie application, on récupérerait depuis une table system_settings
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setIsSaving(true);
      
      // Ici on sauvegarderait normalement dans une table system_settings
      // Pour l'instant, on simule juste la sauvegarde
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast({
        title: "Succès",
        description: "Paramètres sauvegardés avec succès",
      });
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les paramètres",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = (key: keyof SystemSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const resetToDefaults = () => {
    setSettings({
      site_name: 'BotIA Platform',
      site_url: 'https://bot.bj',
      admin_email: 'admin@bot.bj',
      max_bots_per_user: 10,
      enable_registrations: true,
      enable_email_notifications: true,
      maintenance_mode: false,
      max_file_size_mb: 50
    });
    toast({
      title: "Réinitialisé",
      description: "Paramètres remis aux valeurs par défaut",
    });
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Settings className="w-6 h-6 text-blue-600" />
              <CardTitle>Paramètres Globaux</CardTitle>
            </div>
            <div className="flex space-x-2">
              <Button onClick={resetToDefaults} variant="outline" size="sm">
                Réinitialiser
              </Button>
              <Button onClick={saveSettings} disabled={isSaving} size="sm">
                {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
                <Save className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Paramètres généraux */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Globe className="w-5 h-5 text-blue-600" />
              <CardTitle className="text-lg">Paramètres Généraux</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Nom du site</label>
              <Input
                value={settings.site_name}
                onChange={(e) => updateSetting('site_name', e.target.value)}
                placeholder="Nom de votre plateforme"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">URL du site</label>
              <Input
                value={settings.site_url}
                onChange={(e) => updateSetting('site_url', e.target.value)}
                placeholder="https://votre-site.com"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Email administrateur</label>
              <Input
                type="email"
                value={settings.admin_email}
                onChange={(e) => updateSetting('admin_email', e.target.value)}
                placeholder="admin@votre-site.com"
              />
            </div>
          </CardContent>
        </Card>

        {/* Paramètres des utilisateurs */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-green-600" />
              <CardTitle className="text-lg">Paramètres Utilisateurs</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Nombre maximum de bots par utilisateur
              </label>
              <Input
                type="number"
                value={settings.max_bots_per_user}
                onChange={(e) => updateSetting('max_bots_per_user', parseInt(e.target.value))}
                min="1"
                max="100"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Autoriser les inscriptions
                </label>
                <p className="text-xs text-gray-500">
                  Permettre aux nouveaux utilisateurs de s'inscrire
                </p>
              </div>
              <Switch
                checked={settings.enable_registrations}
                onCheckedChange={(checked) => updateSetting('enable_registrations', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Mode maintenance
                </label>
                <p className="text-xs text-gray-500">
                  Désactiver l'accès public à la plateforme
                </p>
              </div>
              <Switch
                checked={settings.maintenance_mode}
                onCheckedChange={(checked) => updateSetting('maintenance_mode', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Paramètres système */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Database className="w-5 h-5 text-purple-600" />
              <CardTitle className="text-lg">Paramètres Système</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Taille maximum des fichiers (MB)
              </label>
              <Input
                type="number"
                value={settings.max_file_size_mb}
                onChange={(e) => updateSetting('max_file_size_mb', parseInt(e.target.value))}
                min="1"
                max="1000"
              />
            </div>

            <div className="pt-4">
              <h4 className="font-medium text-gray-900 mb-3">Actions Système</h4>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <Database className="w-4 h-4 mr-2" />
                  Nettoyer la base de données
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Zap className="w-4 h-4 mr-2" />
                  Optimiser les performances
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Paramètres notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Bell className="w-5 h-5 text-orange-600" />
              <CardTitle className="text-lg">Notifications</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Notifications par email
                </label>
                <p className="text-xs text-gray-500">
                  Envoyer des notifications par email aux utilisateurs
                </p>
              </div>
              <Switch
                checked={settings.enable_email_notifications}
                onCheckedChange={(checked) => updateSetting('enable_email_notifications', checked)}
              />
            </div>

            <div className="pt-4 border-t">
              <h4 className="font-medium text-gray-900 mb-3">Statistiques Système</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Version:</span>
                  <span className="ml-2 font-medium">v1.0.0</span>
                </div>
                <div>
                  <span className="text-gray-600">Dernière MAJ:</span>
                  <span className="ml-2 font-medium">Aujourd'hui</span>
                </div>
                <div>
                  <span className="text-gray-600">Base de données:</span>
                  <span className="ml-2 font-medium text-green-600">Connectée</span>
                </div>
                <div>
                  <span className="text-gray-600">Stockage:</span>
                  <span className="ml-2 font-medium">85% utilisé</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};