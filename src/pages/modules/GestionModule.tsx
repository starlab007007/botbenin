
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FolderOpen, Workflow, Clock, Settings } from 'lucide-react';

export const GestionModule: React.FC = () => {
  const workflows = [
    { name: 'Processus RH - Recrutement', status: 'Actif', executions: 15 },
    { name: 'Suivi projet commercial', status: 'En pause', executions: 8 },
    { name: 'Validation documents', status: 'Actif', executions: 23 }
  ];

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <FolderOpen className="w-8 h-8 text-purple-400 mr-3" />
            <h1 className="text-3xl font-bold text-white">Agent IA Gestion</h1>
          </div>
          <p className="text-slate-300 text-lg">
            Automatisez vos flux métiers et créez des workflows personnalisés avec l'interface visuelle.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-purple-600 to-purple-700 border-0 p-6">
            <h3 className="text-lg font-semibold text-white mb-2">Workflows actifs</h3>
            <div className="text-3xl font-bold text-white">8</div>
          </Card>
          <Card className="bg-gradient-to-r from-blue-600 to-blue-700 border-0 p-6">
            <h3 className="text-lg font-semibold text-white mb-2">Exécutions ce mois</h3>
            <div className="text-3xl font-bold text-white">142</div>
          </Card>
          <Card className="bg-gradient-to-r from-green-600 to-green-700 border-0 p-6">
            <h3 className="text-lg font-semibold text-white mb-2">Temps économisé</h3>
            <div className="text-3xl font-bold text-white">24h</div>
          </Card>
        </div>

        {/* Create Workflow */}
        <Card className="bg-slate-800/50 border-slate-700 p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Créer un nouveau workflow</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Button className="bg-purple-600 hover:bg-purple-700 text-white p-6 h-auto">
              <div className="text-center">
                <Workflow className="w-8 h-8 mb-2 mx-auto" />
                <h3 className="font-semibold mb-1">Éditeur visuel</h3>
                <p className="text-sm text-purple-100">Interface drag & drop</p>
              </div>
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white p-6 h-auto">
              <div className="text-center">
                <Settings className="w-8 h-8 mb-2 mx-auto" />
                <h3 className="font-semibold mb-1">Template prédéfini</h3>
                <p className="text-sm text-blue-100">Modèles métiers</p>
              </div>
            </Button>
          </div>
        </Card>

        {/* Active Workflows */}
        <Card className="bg-slate-800/50 border-slate-700 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Workflows en cours</h2>
          <div className="space-y-4">
            {workflows.map((workflow, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center mr-3">
                    <Workflow className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{workflow.name}</h3>
                    <p className="text-slate-400">{workflow.status}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-center">
                    <div className="text-green-400 font-semibold">{workflow.executions}</div>
                    <p className="text-slate-400 text-xs">Exécutions</p>
                  </div>
                  <Button variant="outline" className="border-slate-600 text-slate-300">
                    <Clock className="w-4 h-4 mr-2" />
                    Historique
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
