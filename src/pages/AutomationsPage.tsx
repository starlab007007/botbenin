
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
    <div className="p-4 lg:p-8 space-y-6 lg:space-y-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Automatisations</h1>
          <p className="text-gray-600">Automatisez vos flux métiers et créez des workflows personnalisés avec l'interface visuelle.</p>
        </div>
        <Button className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3">
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle automatisation
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-purple-500 text-white border-0 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white/90 mb-1 font-medium">Workflows actifs</h3>
              <div className="text-3xl font-bold mb-1">8</div>
            </div>
            <Workflow className="w-8 h-8 text-white/60" />
          </div>
        </Card>
        
        <Card className="p-6 bg-blue-500 text-white border-0 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white/90 mb-1 font-medium">Exécutions ce mois</h3>
              <div className="text-3xl font-bold mb-1">142</div>
            </div>
            <TrendingUp className="w-8 h-8 text-white/60" />
          </div>
        </Card>
        
        <Card className="p-6 bg-green-500 text-white border-0 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white/90 mb-1 font-medium">Temps économisé</h3>
              <div className="text-3xl font-bold mb-1">24h</div>
            </div>
            <Clock className="w-8 h-8 text-white/60" />
          </div>
        </Card>
      </div>

      {/* Create New Workflow Section */}
      <Card className="p-6 bg-white border border-gray-200 rounded-xl">
        <h2 className="text-xl font-semibold mb-4 text-gray-900">Créer un nouveau workflow</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-6 bg-purple-500 text-white border-0 rounded-xl cursor-pointer hover:bg-purple-600 transition-colors">
            <div className="text-center">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Settings className="w-6 h-6" />
              </div>
              <h3 className="font-semibold mb-1">Éditeur visuel</h3>
              <p className="text-sm text-purple-100">Interface drag & drop</p>
            </div>
          </Card>
          
          <Card className="p-6 bg-blue-500 text-white border-0 rounded-xl cursor-pointer hover:bg-blue-600 transition-colors">
            <div className="text-center">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Workflow className="w-6 h-6" />
              </div>
              <h3 className="font-semibold mb-1">Template prédéfini</h3>
              <p className="text-sm text-blue-100">Modèles métiers</p>
            </div>
          </Card>
        </div>
      </Card>

      {/* Workflows en cours */}
      <Card className="p-6 bg-white border border-gray-200 rounded-xl">
        <h2 className="text-xl font-semibold mb-6 text-gray-900">Workflows en cours</h2>
        <div className="space-y-4">
          {automations.slice(0, 3).map((automation, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 ${automation.color} rounded-xl flex items-center justify-center`}>
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
                <Button className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-2">
                  Voir
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
