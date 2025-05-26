
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Workflow, Play, Pause, Settings, Plus, TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react';

export const AutomationsPage: React.FC = () => {
  const automations = [
    { 
      name: 'Email de bienvenue', 
      status: 'Actif', 
      executions: 45, 
      type: 'Marketing', 
      lastRun: '2h',
      color: 'bg-green-500',
      description: 'Envoi automatique d\'emails de bienvenue'
    },
    { 
      name: 'Suivi des leads', 
      status: 'Actif', 
      executions: 23, 
      type: 'Business', 
      lastRun: '5h',
      color: 'bg-blue-500',
      description: 'Qualification et scoring automatique des leads'
    },
    { 
      name: 'Génération de rapports', 
      status: 'En pause', 
      executions: 12, 
      type: 'Gestion', 
      lastRun: '1j',
      color: 'bg-purple-500',
      description: 'Création automatique de rapports hebdomadaires'
    },
    { 
      name: 'Notification WhatsApp', 
      status: 'Actif', 
      executions: 67, 
      type: 'Marketing', 
      lastRun: '30min',
      color: 'bg-pink-500',
      description: 'Notifications clients via WhatsApp Business'
    },
    { 
      name: 'Analyse sentiment', 
      status: 'Erreur', 
      executions: 8, 
      type: 'Analytics', 
      lastRun: '3h',
      color: 'bg-red-500',
      description: 'Analyse des sentiments clients en temps réel'
    },
    { 
      name: 'Synchronisation CRM', 
      status: 'Actif', 
      executions: 156, 
      type: 'Business', 
      lastRun: '1h',
      color: 'bg-teal-500',
      description: 'Sync bidirectionnelle avec le CRM principal'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Actif': return 'bg-green-100 text-green-800 border-green-200';
      case 'En pause': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'Erreur': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Actif': return <CheckCircle className="w-4 h-4" />;
      case 'En pause': return <Pause className="w-4 h-4" />;
      case 'Erreur': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Automatisations</h1>
              <p className="text-gray-600">Automatisez vos flux métiers et créez des workflows personnalisés avec l'interface visuelle.</p>
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg">
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle automatisation
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-gray-600 mb-1 font-medium">Workflows actifs</h3>
                <div className="text-3xl font-bold text-gray-900 mb-1">8</div>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Workflow className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </Card>
          
          <Card className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-gray-600 mb-1 font-medium">Exécutions ce mois</h3>
                <div className="text-3xl font-bold text-gray-900 mb-1">142</div>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>
          
          <Card className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-gray-600 mb-1 font-medium">Temps économisé</h3>
                <div className="text-3xl font-bold text-gray-900 mb-1">24h</div>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Create New Workflow Section */}
        <Card className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-6 text-gray-900">Créer un nouveau workflow</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-purple-50 border border-purple-200 rounded-lg cursor-pointer hover:bg-purple-100 transition-colors">
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Settings className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold mb-1 text-gray-900">Éditeur visuel</h3>
                <p className="text-sm text-gray-600">Interface drag & drop</p>
              </div>
            </div>
            
            <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Workflow className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold mb-1 text-gray-900">Template prédéfini</h3>
                <p className="text-sm text-gray-600">Modèles métiers</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Workflows en cours */}
        <Card className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-6 text-gray-900">Workflows en cours</h2>
          <div className="space-y-4">
            {automations.slice(0, 3).map((automation, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 ${automation.color} rounded-lg flex items-center justify-center`}>
                    <Workflow className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{automation.name}</h3>
                    <p className="text-gray-600 text-sm">{automation.status}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-gray-900 font-semibold">{automation.executions}</div>
                    <div className="text-gray-500 text-sm">Exécutions</div>
                  </div>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg">
                    Voir
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
