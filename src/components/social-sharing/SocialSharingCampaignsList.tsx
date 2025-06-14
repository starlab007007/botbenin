
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useSocialSharingCampaigns } from "@/hooks/useSocialSharingCampaigns";
import { useToast } from "@/hooks/use-toast";
import { Plus, CheckCircle2, Settings, Sparkles } from "lucide-react";
import { AdvancedCampaignDashboard } from "./AdvancedCampaignDashboard";

const initialForm = { name: "", description: "" };

export const SocialSharingCampaignsList: React.FC = () => {
  const { campaigns, isLoading, createCampaign, fetchCampaigns } = useSocialSharingCampaigns();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(f => ({
      ...f,
      [e.target.name]: e.target.value,
    }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) {
      toast({title: "Nom requis", description: "Donnez un nom à la campagne.", variant: "destructive"});
      return;
    }
    const res = await createCampaign({ name: form.name, description: form.description });
    setForm(initialForm);
    setShowForm(false);
    if (res && res.id) {
      setJustAdded(res.id);
    }
    fetchCampaigns();
    toast({title: "Campagne créée", description: "Votre campagne a été ajoutée."});
    setTimeout(() => setJustAdded(null), 2000);
  };

  const handleAdvancedFeatures = (campaignId: string) => {
    setSelectedCampaignId(campaignId);
    setShowAdvanced(true);
  };

  if (showAdvanced) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <Button 
            variant="outline" 
            onClick={() => setShowAdvanced(false)}
          >
            ← Retour aux campagnes
          </Button>
          <h1 className="text-2xl font-bold">Fonctionnalités Avancées</h1>
          <div></div>
        </div>
        <AdvancedCampaignDashboard selectedCampaignId={selectedCampaignId || undefined} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-bold">Campagnes de Partage Personnalisées</h2>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowAdvanced(true)}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Fonctionnalités Avancées
          </Button>
        </div>
        <Button onClick={() => setShowForm(val => !val)}>
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle campagne
        </Button>
      </div>

      {showForm && (
        <Card className="mb-4 p-4 max-w-md">
          <form onSubmit={handleCreate}>
            <div>
              <label className="block text-xs font-medium">Nom*</label>
              <Input name="name" value={form.name} onChange={handleChange} required />
            </div>
            <div className="mt-2">
              <label className="block text-xs">Description</label>
              <Input name="description" value={form.description} onChange={handleChange} />
            </div>
            <div className="flex space-x-2 mt-3">
              <Button type="submit">Ajouter</Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid gap-3">
        {campaigns.map((c) => (
          <Card
            key={c.id}
            className={`p-4 transition-all duration-300 ${justAdded === c.id ? 'border-green-500 bg-green-50' : ''}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center font-semibold">
                {c.name}
                {justAdded === c.id && <CheckCircle2 className="ml-2 text-green-600 w-4 h-4" />}
              </div>
              <div className="flex space-x-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleAdvancedFeatures(c.id)}
                >
                  <Settings className="w-4 h-4 mr-1" />
                  Gérer
                </Button>
              </div>
            </div>
            <div className="text-xs text-gray-600 mb-1">{c.description}</div>
            <div className="text-xs">Créée le {new Date(c.createdAt).toLocaleDateString()}</div>
          </Card>
        ))}
        {isLoading && <div className="text-gray-500">Chargement...</div>}
        {!isLoading && campaigns.length === 0 && <div className="text-gray-400">Aucune campagne pour l'instant.</div>}
      </div>
    </div>
  );
};
