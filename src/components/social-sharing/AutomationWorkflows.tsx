
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAdvancedCampaignFeatures } from "@/hooks/useAdvancedCampaignFeatures";
import { useToast } from "@/hooks/use-toast";
import { 
  Bot, 
  Plus, 
  Play, 
  Pause, 
  Settings, 
  Zap,
  Calendar,
  Target,
  ArrowRight
} from "lucide-react";

interface AutomationWorkflowsProps {
  campaignId?: string;
}

export const AutomationWorkflows: React.FC<AutomationWorkflowsProps> = ({ campaignId }) => {
  const { automationWorkflows, createAutomationWorkflow, isLoading } = useAdvancedCampaignFeatures();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    triggerType: "",
    triggerCondition: "",
    actionType: "",
    actionParameters: {}
  });

  const triggerTypes = [
    { value: "time_based", label: "Basé sur le temps" },
    { value: "engagement_threshold", label: "Seuil d'engagement" },
    { value: "audience_size", label: "Taille d'audience" },
    { value: "performance_metric", label: "Métrique de performance" }
  ];

  const actionTypes = [
    { value: "publish_content", label: "Publier du contenu" },
    { value: "send_notification", label: "Envoyer une notification" },
    { value: "update_campaign", label: "Mettre à jour la campagne" },
    { value: "generate_report", label: "Générer un rapport" }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignId || !form.name || !form.triggerType || !form.actionType) {
      toast({ title: "Informations manquantes", variant: "destructive" });
      return;
    }

    const result = await createAutomationWorkflow({
      campaignId,
      name: form.name,
      triggerConditions: {
        type: form.triggerType,
        condition: form.triggerCondition
      },
      actions: [{
        type: form.actionType,
        parameters: form.actionParameters
      }],
      isActive: true
    });

    if (result) {
      setForm({ name: "", triggerType: "", triggerCondition: "", actionType: "", actionParameters: {} });
      setShowForm(false);
      toast({ title: "Workflow créé", description: "Votre automation a été configurée." });
    }
  };

  const toggleWorkflow = async (workflowId: string, isActive: boolean) => {
    // Implement toggle functionality
    toast({ 
      title: isActive ? "Workflow activé" : "Workflow désactivé",
      description: `L'automation a été ${isActive ? 'activée' : 'désactivée'}.`
    });
  };

  if (!campaignId) {
    return (
      <Card className="p-8 text-center">
        <Bot className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-600 mb-2">
          Sélectionnez une campagne
        </h3>
        <p className="text-gray-500">
          Choisissez une campagne pour configurer des automations.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold flex items-center">
          <Bot className="w-5 h-5 mr-2" />
          Workflows d'Automation
        </h3>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-2" />
          Nouveau Workflow
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Créer un workflow d'automation</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nom du workflow*</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: Publication automatique le matin"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Déclencheur*</label>
                  <Select value={form.triggerType} onValueChange={(value) => setForm(f => ({ ...f, triggerType: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Type de déclencheur" />
                    </SelectTrigger>
                    <SelectContent>
                      {triggerTypes.map(trigger => (
                        <SelectItem key={trigger.value} value={trigger.value}>
                          {trigger.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Action*</label>
                  <Select value={form.actionType} onValueChange={(value) => setForm(f => ({ ...f, actionType: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Type d'action" />
                    </SelectTrigger>
                    <SelectContent>
                      {actionTypes.map(action => (
                        <SelectItem key={action.value} value={action.value}>
                          {action.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Condition du déclencheur</label>
                <Input
                  value={form.triggerCondition}
                  onChange={(e) => setForm(f => ({ ...f, triggerCondition: e.target.value }))}
                  placeholder="Ex: tous les jours à 9h00"
                />
              </div>

              <div className="flex space-x-2">
                <Button type="submit">Créer le workflow</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        <h4 className="font-medium">Workflows configurés</h4>
        
        {automationWorkflows.length === 0 && (
          <Card className="p-8 text-center">
            <Zap className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h4 className="text-lg font-medium text-gray-600 mb-2">
              Aucun workflow configuré
            </h4>
            <p className="text-gray-500 mb-4">
              Créez votre premier workflow pour automatiser vos campagnes.
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Créer un workflow
            </Button>
          </Card>
        )}

        {automationWorkflows.map((workflow) => (
          <Card key={workflow.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${workflow.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                  <h4 className="font-semibold">{workflow.name}</h4>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={workflow.isActive}
                    onCheckedChange={(checked) => toggleWorkflow(workflow.id, checked)}
                  />
                  <Button size="sm" variant="ghost">
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4" />
                  <span>Déclencheur: {workflow.triggerConditions?.type || 'Non défini'}</span>
                </div>
                <ArrowRight className="w-4 h-4" />
                <div className="flex items-center space-x-2">
                  <Target className="w-4 h-4" />
                  <span>Action: {workflow.actions?.[0]?.type || 'Non définie'}</span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t flex justify-between items-center text-xs text-gray-500">
                <span>
                  Exécuté {workflow.executionCount || 0} fois
                  {workflow.successRate && ` • ${Math.round(workflow.successRate)}% de réussite`}
                </span>
                <span>
                  {workflow.lastExecuted 
                    ? `Dernière exécution: ${new Date(workflow.lastExecuted).toLocaleDateString()}`
                    : 'Jamais exécuté'
                  }
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
