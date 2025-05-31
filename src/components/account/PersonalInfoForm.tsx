
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuthUser } from '@/contexts/AuthContext';
import { Save, User, Mail, Phone, Calendar, Shield } from 'lucide-react';

interface PersonalInfoFormProps {
  authUser: AuthUser;
  profile: any;
  formData: {
    full_name: string;
    phone: string;
    bio: string;
    language: string;
    timezone: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<{
    full_name: string;
    phone: string;
    bio: string;
    language: string;
    timezone: string;
  }>>;
  onUpdate: () => Promise<void>;
  isUpdating: boolean;
  userStats?: {
    email?: string;
    full_name?: string;
    phone?: string;
  };
}

export const PersonalInfoForm: React.FC<PersonalInfoFormProps> = ({
  authUser,
  profile,
  formData,
  setFormData,
  onUpdate,
  isUpdating,
  userStats
}) => {
  const isDataMasked = (value: string) => {
    return value && (value.includes('[') && value.includes('masqué'));
  };

  const isDemoAccount = isDataMasked(userStats?.email || '') || 
                       isDataMasked(userStats?.full_name || '') || 
                       isDataMasked(userStats?.phone || '');

  return (
    <Card className="uniform-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Informations personnelles
        </h3>
        {!isDemoAccount && (
          <Button 
            onClick={onUpdate}
            disabled={isUpdating}
            className="uniform-button-primary"
          >
            <Save className="w-4 h-4 mr-2" />
            {isUpdating ? 'Mise à jour...' : 'Sauvegarder'}
          </Button>
        )}
      </div>
      
      {isDemoAccount && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-yellow-600" />
            <span className="text-sm text-yellow-800">
              Il s'agit d'un compte de démonstration. Les informations personnelles sont masquées.
            </span>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <User className="w-4 h-4 inline mr-2" />
            Nom complet
          </label>
          <Input
            value={isDemoAccount ? '[Nom masqué]' : formData.full_name}
            onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
            placeholder="Votre nom complet"
            className="uniform-input"
            disabled={isDemoAccount}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Mail className="w-4 h-4 inline mr-2" />
            Email
          </label>
          <Input
            value={isDemoAccount ? '[Email masqué]' : (authUser.email || '')}
            disabled
            className="uniform-input bg-gray-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Phone className="w-4 h-4 inline mr-2" />
            Téléphone
          </label>
          <Input
            value={isDemoAccount ? '[Tél masqué]' : formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            placeholder="+229 XX XX XX XX"
            className="uniform-input"
            disabled={isDemoAccount}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Calendar className="w-4 h-4 inline mr-2" />
            Membre depuis
          </label>
          <Input
            value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString('fr-FR') : 'N/A'}
            disabled
            className="uniform-input bg-gray-100"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Biographie
          </label>
          <textarea
            value={isDemoAccount ? 'Biographie masquée pour les comptes de démonstration' : formData.bio}
            onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
            placeholder="Parlez-nous de vous..."
            className="uniform-input min-h-[100px]"
            rows={4}
            disabled={isDemoAccount}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Langue
          </label>
          <select
            value={formData.language}
            onChange={(e) => setFormData(prev => ({ ...prev, language: e.target.value }))}
            className="uniform-input"
            disabled={isDemoAccount}
          >
            <option value="fr">Français</option>
            <option value="en">English</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fuseau horaire
          </label>
          <select
            value={formData.timezone}
            onChange={(e) => setFormData(prev => ({ ...prev, timezone: e.target.value }))}
            className="uniform-input"
            disabled={isDemoAccount}
          >
            <option value="UTC">UTC</option>
            <option value="Africa/Porto-Novo">Afrique/Porto-Novo</option>
            <option value="Europe/Paris">Europe/Paris</option>
          </select>
        </div>
      </div>
    </Card>
  );
};
