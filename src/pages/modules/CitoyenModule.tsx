
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
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Users className="w-8 h-8 text-orange-400 mr-3" />
            <h1 className="text-3xl font-bold text-white">IA Citoyen</h1>
          </div>
          <p className="text-slate-300 text-lg">
            Services intelligents pour les citoyens : emploi, démarches administratives, réservations et aide juridique.
          </p>
        </div>

        {/* Quick Access */}
        <Card className="bg-gradient-to-r from-orange-600 to-red-600 border-0 p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Accès rapide</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Button className="bg-white/20 hover:bg-white/30 text-white p-4 h-auto">
              <div className="text-center">
                <Phone className="w-6 h-6 mb-2 mx-auto" />
                <span>Urgences - 911</span>
              </div>
            </Button>
            <Button className="bg-white/20 hover:bg-white/30 text-white p-4 h-auto">
              <div className="text-center">
                <FileText className="w-6 h-6 mb-2 mx-auto" />
                <span>Démarche express</span>
              </div>
            </Button>
          </div>
        </Card>

        {/* Services Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {services.map((service, index) => (
            <Card key={index} className="bg-slate-800/50 border-slate-700 p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center mr-3">
                  <service.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{service.title}</h3>
                  <p className="text-slate-400">{service.description}</p>
                </div>
              </div>
              <div className="space-y-2">
                {service.actions.map((action, actionIndex) => (
                  <Button
                    key={actionIndex}
                    variant="outline"
                    className="w-full text-left justify-start border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    {action}
                  </Button>
                ))}
              </div>
            </Card>
          ))}
        </div>

        {/* Popular Services */}
        <Card className="bg-slate-800/50 border-slate-700 p-6 mt-8">
          <h2 className="text-xl font-semibold text-white mb-4">Services populaires</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-slate-700/50 rounded-lg">
              <Briefcase className="w-8 h-8 text-orange-400 mx-auto mb-2" />
              <h3 className="font-semibold text-white">Offres d'emploi</h3>
              <p className="text-slate-400 text-sm">1,234 nouvelles offres</p>
            </div>
            <div className="text-center p-4 bg-slate-700/50 rounded-lg">
              <MapPin className="w-8 h-8 text-orange-400 mx-auto mb-2" />
              <h3 className="font-semibold text-white">Restaurants</h3>
              <p className="text-slate-400 text-sm">456 établissements</p>
            </div>
            <div className="text-center p-4 bg-slate-700/50 rounded-lg">
              <FileText className="w-8 h-8 text-orange-400 mx-auto mb-2" />
              <h3 className="font-semibold text-white">Formulaires</h3>
              <p className="text-slate-400 text-sm">89 démarches disponibles</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
