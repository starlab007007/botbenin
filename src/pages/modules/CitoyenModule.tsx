
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Briefcase, Scale, FileText, MapPin, Phone } from 'lucide-react';

export const CitoyenModule: React.FC = () => {
  const services = [
    {
      icon: Briefcase,
      title: 'Recherche d\'emploi',
      description: 'Assistant intelligent pour trouver un emploi',
      actions: ['Créer un CV', 'Rechercher des offres', 'Préparer entretien']
    },
    {
      icon: MapPin,
      title: 'Réservations',
      description: 'Restaurants, hôtels et services locaux',
      actions: ['Réserver restaurant', 'Trouver un hôtel', 'Services locaux']
    },
    {
      icon: Scale,
      title: 'Aide juridique',
      description: 'Informations juridiques de base',
      actions: ['Droits du locataire', 'Procédures légales', 'Conseil juridique']
    },
    {
      icon: FileText,
      title: 'Démarches administratives',
      description: 'Assistance pour les formalités',
      actions: ['Certificats', 'Formulaires', 'Démarches en ligne']
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 mb-8">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center mr-4">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">IA Citoyen</h1>
              <p className="text-gray-600 text-lg mt-1">
                Services intelligents pour les citoyens : emploi, démarches administratives, réservations et aide juridique.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Access */}
        <Card className="p-6 mb-8 bg-white border border-gray-200 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Accès rapide</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button className="bg-red-600 hover:bg-red-700 text-white p-4 h-auto rounded-lg transition-all">
              <div className="text-center">
                <Phone className="w-6 h-6 mb-2 mx-auto" />
                <span>Urgences - 911</span>
              </div>
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white p-4 h-auto rounded-lg transition-all">
              <div className="text-center">
                <FileText className="w-6 h-6 mb-2 mx-auto" />
                <span>Démarche express</span>
              </div>
            </Button>
          </div>
        </Card>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {services.map((service, index) => (
            <Card key={index} className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                  <service.icon className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{service.title}</h3>
                  <p className="text-gray-600 text-sm">{service.description}</p>
                </div>
              </div>
              <div className="space-y-2">
                {service.actions.map((action, actionIndex) => (
                  <Button
                    key={actionIndex}
                    variant="outline"
                    className="w-full text-left justify-start border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg transition-all"
                  >
                    {action}
                  </Button>
                ))}
              </div>
            </Card>
          ))}
        </div>

        {/* Popular Services */}
        <Card className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Services populaires</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-100">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Briefcase className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Offres d'emploi</h3>
              <p className="text-gray-600 text-sm">1,234 nouvelles offres</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-100">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <MapPin className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Restaurants</h3>
              <p className="text-gray-600 text-sm">456 établissements</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-100">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Formulaires</h3>
              <p className="text-gray-600 text-sm">89 démarches disponibles</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
