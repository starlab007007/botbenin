
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Workflow, Play, Pause, Settings, Plus } from 'lucide-react';

export const AutomationsPage: React.FC = () => {
  const automations = [
    { name: 'Email de bienvenue', status: 'Actif', executions: 45, type: 'Marketing' },
    { name: 'Suivi des leads', status: 'Actif', executions: 23, type: 'Business' },
    { name: 'Génération de rapports', status: 'En pause', executions: 12, type: 'Gestion' },
    { name: 'Notification WhatsApp', status: 'Actif', executions: 67, type: 'Marketing' }
  ];

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Automatisations</h1>
            <p className="text-slate-300">Gérez vos workflows et processus automatisés</p>
          </div>
          <Button className="bg-green-600 hover:bg-green-700">
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle automatisation
          </Button>
        </div>

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-green-600 to-green-700 border-0 p-6">
            <h3 className="text-white mb-2">Total actif</h3>
            <div className="text-3xl font-bold text-white">12</div>
          </Card>
          <Card className="bg-gradient-to-r from-blue-600 to-blue-700 border-0 p-6">
            <h3 className="text-white mb-2">Exécutions today</h3>
            <div className="text-3xl font-bold text-white">89</div>
          </Card>
          <Card className="bg-gradient-to-r from-purple-600 to-purple-700 border-0 p-6">
            <h3 className="text-white mb-2">Temps économisé</h3>
            <div className="text-3xl font-bold text-white">15h</div>
          </Card>
          <Card className="bg-gradient-to-r from-orange-600 to-orange-700 border-0 p-6">
            <h3 className="text-white mb-2">Erreurs</h3>
            <div className="text-3xl font-bold text-white">2</div>
          </Card>
        </div>

        <Card className="bg-slate-800/50 border-slate-700 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Workflows actifs</h2>
          <div className="space-y-4">
            {automations.map((automation, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                    <Workflow className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{automation.name}</h3>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        automation.status === 'Actif' ? 'bg-green-600 text-white' : 'bg-yellow-600 text-white'
                      }`}>
                        {automation.status}
                      </span>
                      <span className="text-slate-400 text-sm">{automation.type}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-center">
                    <div className="text-green-400 font-semibold">{automation.executions}</div>
                    <p className="text-slate-400 text-xs">Exécutions</p>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" className="border-slate-600">
                      {automation.status === 'Actif' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <Button variant="outline" size="sm" className="border-slate-600">
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
