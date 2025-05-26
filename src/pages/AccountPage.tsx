
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { User, Settings, CreditCard, Shield, Bell, Palette, Lock, Mail, Phone, Edit3, Save, X } from 'lucide-react';

export const AccountPage: React.FC = () => {
  const { user, updateProfile, isAuthenticated } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || ''
  });

  if (!isAuthenticated || !user) {
    return (
      <div className="p-4 lg:p-8 bg-gray-50 min-h-screen">
        <Card className="p-8 text-center">
          <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Accès restreint</h2>
          <p className="text-gray-600">Veuillez vous connecter pour accéder à votre compte.</p>
        </Card>
      </div>
    );
  }

  const handleSaveProfile = () => {
    updateProfile(editData);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditData({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || ''
    });
    setIsEditing(false);
  };

  const getSubscriptionInfo = () => {
    const subscription = user.subscription;
    if (!subscription) return { name: 'Gratuit', price: '0€/mois', color: 'bg-gray-50 border-gray-200 text-gray-700' };
    
    switch (subscription.type) {
      case 'pro':
        return { name: 'Plan Professionnel', price: '49€/mois', color: 'bg-green-50 border-green-200 text-green-700' };
      case 'enterprise':
        return { name: 'Plan Enterprise', price: '99€/mois', color: 'bg-blue-50 border-blue-200 text-blue-700' };
      default:
        return { name: 'Plan Gratuit', price: '0€/mois', color: 'bg-gray-50 border-gray-200 text-gray-700' };
    }
  };

  const subscriptionInfo = getSubscriptionInfo();

  const accountSections = [
    {
      title: 'Profil utilisateur',
      icon: User,
      color: 'bg-blue-500',
      content: (
        <div className="space-y-4">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
              {(user.name || 'U').split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{user.name || 'Utilisateur'}</h3>
              <p className="text-gray-600">{user.email}</p>
              <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full capitalize">
                {user.role || 'user'}
              </span>
            </div>
          </div>
          
          {isEditing ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-name">Nom complet</Label>
                <Input
                  id="edit-name"
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editData.email}
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                />
              </div>
              <div className="lg:col-span-2">
                <Label htmlFor="edit-phone">Téléphone</Label>
                <Input
                  id="edit-phone"
                  type="tel"
                  value={editData.phone}
                  onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                  placeholder="+229 XX XX XX XX"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="text-gray-600 text-sm">Nom complet</label>
                <p className="text-gray-900 font-semibold">{user.name || 'Non défini'}</p>
              </div>
              <div>
                <label className="text-gray-600 text-sm">Email</label>
                <p className="text-gray-900 font-semibold">{user.email}</p>
              </div>
              {user.phone && (
                <div className="lg:col-span-2">
                  <label className="text-gray-600 text-sm">Téléphone</label>
                  <p className="text-gray-900 font-semibold">{user.phone}</p>
                </div>
              )}
              <div className="lg:col-span-2">
                <label className="text-gray-600 text-sm">Dernière connexion</label>
                <p className="text-gray-900 font-semibold">
                  {user.lastLogin ? user.lastLogin.toLocaleDateString('fr-FR') : 'Jamais'}
                </p>
              </div>
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Abonnement',
      icon: CreditCard,
      color: 'bg-green-500',
      content: (
        <div className="space-y-4">
          <div className={`flex items-center justify-between p-4 rounded-xl border ${subscriptionInfo.color}`}>
            <div>
              <h4 className="font-semibold">{subscriptionInfo.name}</h4>
              <p className="text-sm">Accès selon votre niveau d'abonnement</p>
            </div>
            <div className="font-bold text-xl">{subscriptionInfo.price}</div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="text-gray-600 text-sm">Statut</label>
              <p className="text-gray-900 font-semibold capitalize">
                {user.subscription?.status || 'Actif'}
              </p>
            </div>
            <div>
              <label className="text-gray-600 text-sm">Membre depuis</label>
              <p className="text-gray-900 font-semibold">
                {user.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR') : 'Récemment'}
              </p>
            </div>
          </div>
        </div>
      )
    }
  ];

  const settingsOptions = [
    { title: 'Notifications email', status: 'Activé', icon: Bell, color: 'bg-purple-500' },
    { title: 'Mode sombre', status: 'Activé', icon: Palette, color: 'bg-indigo-500' },
    { title: 'Authentification 2FA', status: 'Non configuré', icon: Lock, color: 'bg-red-500' },
    { title: 'Langue', status: 'Français', icon: Settings, color: 'bg-orange-500' }
  ];

  return (
    <div className="p-4 lg:p-8 space-y-6 lg:space-y-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Mon Compte</h1>
        <p className="text-gray-600">Gérez votre profil et vos paramètres</p>
      </div>

      {/* Account Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {accountSections.map((section, index) => (
          <Card key={index} className="p-6 bg-white border border-gray-200 rounded-xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className={`w-12 h-12 ${section.color} rounded-xl flex items-center justify-center shadow-sm mr-4`}>
                  <section.icon className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">{section.title}</h2>
              </div>
              
              {section.title === 'Profil utilisateur' && (
                <div className="flex space-x-2">
                  {isEditing ? (
                    <>
                      <Button
                        size="sm"
                        onClick={handleSaveProfile}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Save className="w-4 h-4 mr-1" />
                        Sauvegarder
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancelEdit}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Annuler
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit3 className="w-4 h-4 mr-1" />
                      Modifier
                    </Button>
                  )}
                </div>
              )}
            </div>
            
            {section.content}
            
            {section.title === 'Abonnement' && (
              <Button className={`${section.color} hover:opacity-90 text-white mt-6 w-full lg:w-auto`}>
                Gérer l'abonnement
              </Button>
            )}
          </Card>
        ))}
      </div>

      {/* Settings Grid */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Préférences</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {settingsOptions.map((option, index) => (
            <Card key={index} className="p-6 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 ${option.color} rounded-lg flex items-center justify-center`}>
                    <option.icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-gray-900 font-medium">{option.title}</span>
                </div>
                <span className={`px-3 py-1 text-sm rounded-full font-medium ${
                  option.status === 'Activé' ? 'bg-green-100 text-green-800' :
                  option.status === 'Non configuré' ? 'bg-red-100 text-red-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {option.status}
                </span>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Security Section */}
      <Card className="p-8 bg-white border border-gray-200 rounded-xl">
        <div className="flex items-center mb-6">
          <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center shadow-sm mr-4">
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
