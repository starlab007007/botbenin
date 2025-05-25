
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
    <div className="p-4 lg:p-8 space-y-6 lg:space-y-8 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center mr-4">
              <FolderOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Agent IA Gestion</h1>
              <p className="text-gray-600 text-lg mt-1">
                Automatisez vos flux métiers et créez des workflows personnalisés avec l'interface visuelle.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 bg-white border border-gray-200 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">Workflows actifs</h3>
                <div className="text-2xl font-bold text-gray-900">8</div>
              </div>
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Workflow className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </Card>
          <Card className="p-6 bg-white border border-gray-200 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">Exécutions ce mois</h3>
                <div className="text-2xl font-bold text-gray-900">142</div>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Settings className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </Card>
          <Card className="p-6 bg-white border border-gray-200 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">Temps économisé</h3>
                <div className="text-2xl font-bold text-gray-900">24h</div>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Create Workflow */}
        <Card className="p-6 mb-8 bg-white border border-gray-200 rounded-xl">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Créer un nouveau workflow</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button className="bg-purple-500 hover:bg-purple-600 text-white p-6 h-auto rounded-xl transition-all">
              <div className="text-center">
                <Workflow className="w-8 h-8 mb-2 mx-auto" />
                <h3 className="font-semibold mb-1">Éditeur visuel</h3>
                <p className="text-sm text-purple-100">Interface drag & drop</p>
              </div>
            </Button>
            <Button className="bg-blue-500 hover:bg-blue-600 text-white p-6 h-auto rounded-xl transition-all">
              <div className="text-center">
                <Settings className="w-8 h-8 mb-2 mx-auto" />
                <h3 className="font-semibold mb-1">Template prédéfini</h3>
                <p className="text-sm text-blue-100">Modèles métiers</p>
              </div>
            </Button>
          </div>
        </Card>

        {/* Active Workflows */}
        <Card className="p-6 bg-white border border-gray-200 rounded-xl">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Workflows en cours</h2>
          <div className="space-y-4">
            {workflows.map((workflow, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center mr-3">
                    <Workflow className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{workflow.name}</h3>
                    <p className="text-gray-600 text-sm">{workflow.status}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-center">
                    <div className="text-green-600 font-semibold">{workflow.executions}</div>
                    <p className="text-gray-500 text-xs">Exécutions</p>
                  </div>
                  <Button variant="outline" className="border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg">
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
