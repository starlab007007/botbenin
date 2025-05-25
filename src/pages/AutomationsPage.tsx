
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Workflow, Play, Pause, Settings, Plus, TrendingUp, Clock, CheckCircle } from 'lucide-react';

export const AutomationsPage: React.FC = () => {
  const automations = [
    { name: 'Email de bienvenue', status: 'Actif', executions: 45, type: 'Marketing', lastRun: '2h' },
    { name: 'Suivi des leads', status: 'Actif', executions: 23, type: 'Business', lastRun: '5h' },
    { name: 'Génération de rapports', status: 'En pause', executions: 12, type: 'Gestion', lastRun: '1j' },
    { name: 'Notification WhatsApp', status: 'Actif', executions: 67, type: 'Marketing', lastRun: '30min' }
  ];

  return (
    <div className="p-8 font-body">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">Automatisations</h1>
            <p className="text-muted-foreground">Gérez vos workflows et processus automatisés</p>
          </div>
          <Button className="bot-bj-button-secondary">
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle automatisation
          </Button>
        </div>

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="bot-bj-stats-card secondary">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-secondary-foreground mb-2 font-medium">Total actif</h3>
                <div className="text-3xl font-bold text-secondary-foreground">12</div>
                <p className="text-secondary-foreground/80 text-sm flex items-center mt-1">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  +15% ce mois
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-secondary-foreground/60" />
            </div>
          </Card>
          
          <Card className="bot-bj-stats-card primary">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white mb-2 font-medium">Exécutions aujourd'hui</h3>
                <div className="text-3xl font-bold text-white">89</div>
                <p className="text-white/80 text-sm flex items-center mt-1">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  +8% vs hier
                </p>
              </div>
              <Workflow className="w-8 h-8 text-white/60" />
            </div>
          </Card>
          
          <Card className="bot-bj-stats-card accent">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-accent-foreground mb-2 font-medium">Temps économisé</h3>
                <div className="text-3xl font-bold text-accent-foreground">15h</div>
                <p className="text-accent-foreground/80 text-sm flex items-center mt-1">
                  <Clock className="w-3 h-3 mr-1" />
                  Cette semaine
                </p>
              </div>
              <Clock className="w-8 h-8 text-accent-foreground/60" />
            </div>
          </Card>
          
          <Card className="bot-bj-card">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-muted-foreground mb-2 font-medium">Erreurs</h3>
                <div className="text-3xl font-bold text-foreground">2</div>
                <p className="text-muted-foreground text-sm flex items-center mt-1">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  -50% vs hier
                </p>
              </div>
              <Settings className="w-8 h-8 text-muted-foreground" />
            </div>
          </Card>
        </div>

        <Card className="bot-bj-card">
          <h2 className="text-xl font-display font-semibold text-foreground mb-6">Workflows actifs</h2>
          <div className="space-y-4">
            {automations.map((automation, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-border/20 hover:bg-muted/30 transition-colors">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-primary to-secondary rounded-xl flex items-center justify-center mr-4 shadow-md">
                    <Workflow className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground font-body">{automation.name}</h3>
                    <div className="flex items-center space-x-3 mt-1">
                      <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                        automation.status === 'Actif' 
                          ? 'bg-secondary/10 text-secondary border border-secondary/20' 
                          : 'bg-accent/10 text-accent border border-accent/20'
                      }`}>
                        {automation.status}
                      </span>
                      <span className="text-muted-foreground text-sm">{automation.type}</span>
                      <span className="text-muted-foreground text-sm">• Dernière exécution: {automation.lastRun}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-center">
                    <div className="text-secondary font-bold text-lg">{automation.executions}</div>
                    <p className="text-muted-foreground text-xs">Exécutions</p>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" className="border-border hover:bg-muted">
                      {automation.status === 'Actif' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <Button variant="outline" size="sm" className="border-border hover:bg-muted">
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
