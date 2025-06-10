
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 mb-8">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mr-4">
              <FolderOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Agent IA Gestion</h1>
              <p className="text-gray-600 text-lg mt-1">
                Automatisez vos flux métiers et créez des workflows personnalisés avec l'interface visuelle.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-gray-600 mb-1 font-medium">Workflows actifs</h3>
                <div className="text-3xl font-bold text-gray-900">8</div>
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
                <div className="text-3xl font-bold text-gray-900">142</div>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Settings className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>
          <Card className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-gray-600 mb-1 font-medium">Temps économisé</h3>
                <div className="text-3xl font-bold text-gray-900">24h</div>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Create Workflow */}
        <Card className="p-6 mb-8 bg-white border border-gray-200 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Créer un nouveau workflow</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-purple-50 border border-purple-200 rounded-lg cursor-pointer hover:bg-purple-100 transition-colors">
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Workflow className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold mb-1 text-gray-900">Éditeur visuel</h3>
                <p className="text-sm text-gray-600">Interface drag & drop</p>
              </div>
            </div>
            <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Settings className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold mb-1 text-gray-900">Template prédéfini</h3>
                <p className="text-sm text-gray-600">Modèles métiers</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Active Workflows */}
        <Card className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Workflows en cours</h2>
          <div className="space-y-4">
            {workflows.map((workflow, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mr-3">
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
