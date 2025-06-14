
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdvancedCampaignFeatures } from "@/hooks/useAdvancedCampaignFeatures";
import { useToast } from "@/hooks/use-toast";
import { Plus, Copy, Eye, Trash2 } from "lucide-react";

export const CampaignTemplatesManager: React.FC = () => {
  const { templates, isLoading, createTemplate, fetchTemplates } = useAdvancedCampaignFeatures();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "general",
    templateData: {}
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) {
      toast({ title: "Nom requis", variant: "destructive" });
      return;
    }

    const result = await createTemplate(form);
    if (result) {
      setForm({ name: "", description: "", category: "general", templateData: {} });
      setShowForm(false);
      toast({ title: "Template créé", description: "Votre template a été sauvegardé." });
    }
  };

  const categories = [
    { value: "general", label: "Général" },
    { value: "promotion", label: "Promotion" },
    { value: "event", label: "Événement" },
    { value: "product", label: "Produit" },
    { value: "brand", label: "Marque" }
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Templates de Campagne</h3>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-2" />
          Nouveau Template
        </Button>
      </div>

      {showForm && (
        <Card className="p-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nom*</label>
              <Input
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Catégorie</label>
              <Select value={form.category} onValueChange={(value) => setForm(f => ({ ...f, category: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex space-x-2">
              <Button type="submit">Créer</Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Annuler
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <Card key={template.id} className="p-4">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-semibold">{template.name}</h4>
              <div className="flex space-x-1">
                <Button size="sm" variant="ghost">
                  <Eye className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost">
                  <Copy className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-2">{template.description}</p>
            <div className="flex justify-between items-center text-xs text-gray-500">
              <span className="bg-gray-100 px-2 py-1 rounded">{template.category}</span>
              <span>{template.usageCount} utilisations</span>
            </div>
          </Card>
        ))}
      </div>

      {isLoading && <div className="text-center text-gray-500">Chargement...</div>}
      {!isLoading && templates.length === 0 && (
        <div className="text-center text-gray-400">Aucun template pour l'instant.</div>
      )}
    </div>
  );
};
