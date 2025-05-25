
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
      case 'En pause': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
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
    <div className="p-4 lg:p-8 space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Automatisations</h1>
          <p className="text-gray-600">Gérez vos workflows et processus automatisés</p>
        </div>
        <Button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 lg:px-6 lg:py-3">
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle automatisation
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <Card className="p-4 lg:p-6 bg-gradient-to-r from-green-500 to-green-600 text-white border-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white/90 mb-1 font-medium text-sm lg:text-base">Total actif</h3>
              <div className="text-2xl lg:text-3xl font-bold">12</div>
              <p className="text-white/80 text-xs lg:text-sm flex items-center mt-1">
                <TrendingUp className="w-3 h-3 mr-1" />
                +15%
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-white/60" />
          </div>
        </Card>
        
        <Card className="p-4 lg:p-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white/90 mb-1 font-medium text-sm lg:text-base">Exécutions</h3>
              <div className="text-2xl lg:text-3xl font-bold">289</div>
              <p className="text-white/80 text-xs lg:text-sm flex items-center mt-1">
                <TrendingUp className="w-3 h-3 mr-1" />
                +8%
              </p>
            </div>
            <Workflow className="w-8 h-8 text-white/60" />
          </div>
        </Card>
        
        <Card className="p-4 lg:p-6 bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white/90 mb-1 font-medium text-sm lg:text-base">Temps économisé</h3>
              <div className="text-2xl lg:text-3xl font-bold">15h</div>
              <p className="text-white/80 text-xs lg:text-sm flex items-center mt-1">
                <Clock className="w-3 h-3 mr-1" />
                Cette semaine
              </p>
            </div>
            <Clock className="w-8 h-8 text-white/60" />
          </div>
        </Card>
        
        <Card className="p-4 lg:p-6 bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white/90 mb-1 font-medium text-sm lg:text-base">Erreurs</h3>
              <div className="text-2xl lg:text-3xl font-bold">2</div>
              <p className="text-white/80 text-xs lg:text-sm flex items-center mt-1">
                <TrendingUp className="w-3 h-3 mr-1" />
                -50%
              </p>
            </div>
            <Settings className="w-8 h-8 text-white/60" />
          </div>
        </Card>
      </div>

      {/* Automations Grid */}
      <div>
        <h2 className="text-lg lg:text-xl font-semibold text-gray-900 mb-4 lg:mb-6">Workflows actifs</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
          {automations.map((automation, index) => (
            <Card key={index} className="p-4 lg:p-6 hover:shadow-lg transition-all duration-200 border border-gray-100">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 ${automation.color} rounded-xl flex items-center justify-center shadow-md`}>
                  <Workflow className="w-6 h-6 text-white" />
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" className="p-2">
                    {automation.status === 'Actif' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                  <Button variant="outline" size="sm" className="p-2">
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <h3 className="font-semibold text-gray-900 mb-2 text-sm lg:text-base">{automation.name}</h3>
              <p className="text-gray-600 text-xs lg:text-sm mb-4 line-clamp-2">{automation.description}</p>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`px-3 py-1 text-xs rounded-full font-medium border ${getStatusColor(automation.status)} flex items-center space-x-1`}>
                    {getStatusIcon(automation.status)}
                    <span>{automation.status}</span>
                  </span>
                  <span className="text-xs text-gray-500">{automation.type}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="text-center">
                    <div className="text-lg lg:text-xl font-bold text-gray-900">{automation.executions}</div>
                    <p className="text-xs text-gray-500">Exécutions</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">{automation.lastRun}</div>
                    <p className="text-xs text-gray-500">Dernière exec.</p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
