
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdvancedCampaignFeatures } from "@/hooks/useAdvancedCampaignFeatures";
import { useToast } from "@/hooks/use-toast";
import { Plus, Eye, Copy, Trash2 } from "lucide-react";

const TABS = [
  { key: "templates", label: "Templates", icon: <span className="mr-1"><Copy size={16} /></span> },
  { key: "ia", label: "IA", icon: <span className="mr-1">🤖</span> },
  { key: "audience", label: "Audience", icon: <span className="mr-1">👥</span> },
  { key: "planning", label: "Planning", icon: <span className="mr-1">📅</span> },
  { key: "analytics", label: "Analytics", icon: <span className="mr-1">📊</span> },
  { key: "auto", label: "Auto", icon: <span className="mr-1">⚙️</span> }
];

const CATEGORIES = [
  { value: "general", label: "Général" },
  { value: "promotion", label: "Promotion" },
  { value: "event", label: "Événement" },
  { value: "product", label: "Produit" },
  { value: "brand", label: "Marque" }
];

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
  const [activeTab, setActiveTab] = useState("templates");

  // Modals & actions
  const [showPreviewTemplate, setShowPreviewTemplate] = useState<null | any>(null);

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

  const handleCopy = (tpl: any) => {
    navigator.clipboard.writeText(JSON.stringify(tpl, null, 2));
    toast({
      title: "Template copié",
      description: `Le contenu du template "${tpl.name}" est copié dans le presse-papier.`,
      duration: 1800
    });
  };

  const handleDelete = async (tpl: any) => {
    if (!window.confirm(`Supprimer définitivement le template "${tpl.name}" ?`)) return;
    // Ici on pourrait rajouter une méthode deleteTemplate côté hook, pour le démo on retire localement
    // Ajoutez la méthode au hook si stockage côté backend
    toast({ title: "Suppression non implémentée", description: "En démo: suppression locale." });
    // DEMO: suppression locale
    // fetchTemplates(); // dans la vraie vie, réactivez la liste après suppression
  };

  // UI du badge de catégorie, couleur claire par défaut
  const CategoryBadge = ({ value }: { value: string }) => (
    <span className="bg-gray-100 px-2 py-0.5 text-xs rounded text-gray-700 mr-1">{CATEGORIES.find(c => c.value === value)?.label || value}</span>
  );

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <button 
          onClick={() => window.history.back()}
          className="px-3 py-1 mr-2 border rounded text-sm bg-white hover:bg-gray-50"
        >← Retour aux campagnes</button>

        <h2 className="inline text-3xl font-bold text-gray-900 ml-1 align-middle">Campagnes de Partage Personnalisées</h2>
        <div className="text-gray-600 mb-1">
          Créez et gérez vos campagnes de partage social avec des fonctionnalités avancées d'IA et d'automatisation.
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-2xl font-semibold">Fonctionnalités Avancées</h2>
        <div className="flex gap-2 flex-wrap md:flex-nowrap border-b">
          {TABS.map(t => (
            <button
              key={t.key}
              className={`flex items-center rounded-t px-3 py-2 mr-2 transition text-sm font-medium ${
                activeTab === t.key ?
                  "bg-white border-x border-t border-b-0 border-gray-200 shadow text-primary outline outline-2 outline-offset-[-2px]"
                  : "bg-muted/50 text-gray-600 hover:bg-white/75"
              }`}
              style={{marginBottom: "-1px"}}
              onClick={() => setActiveTab(t.key)}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Affichage que pour l’onglet Templates */}
      {activeTab === "templates" && (
        <>
          <div className="flex flex-wrap justify-between items-center mt-4 mb-5">
            <h3 className="text-lg font-semibold">Templates de Campagne</h3>
            <Button onClick={() => setShowForm(!showForm)}>
              <Plus className="w-4 h-4 mr-2" />
              Nouveau Template
            </Button>
          </div>

          {showForm && (
            <Card className="p-4 max-w-md mx-auto mb-3">
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
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex space-x-2">
                  <Button type="submit">Créer</Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
                </div>
              </form>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <Card
                key={template.id}
                className="p-4 flex flex-col justify-between"
                style={{minHeight: 150}}
              >
                <div className="flex justify-between mb-2">
                  <div>
                    <h4 className="font-semibold text-base mb-2">{template.name}</h4>
                  </div>
                  <div className="flex space-x-0.5">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Voir"
                      onClick={() => setShowPreviewTemplate(template)}
                      className="rounded p-2"
                    ><Eye size={18}/></Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Copier"
                      onClick={() => handleCopy(template)}
                      className="rounded p-2"
                    ><Copy size={18}/></Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Supprimer"
                      onClick={() => handleDelete(template)}
                      className="rounded p-2 hover:text-red-600"
                    ><Trash2 size={18}/></Button>
                  </div>
                </div>
                <div className="mb-2 text-sm text-gray-700">{template.description}</div>
                <div className="flex items-end justify-between mt-2 text-xs text-gray-600">
                  <CategoryBadge value={template.category} />
                  <span>{template.usageCount ?? 0} utilisations</span>
                </div>
              </Card>
            ))}
          </div>

          {isLoading && <div className="text-center text-gray-500">Chargement...</div>}
          {!isLoading && templates.length === 0 && (
            <div className="text-center text-gray-400">Aucun template pour l'instant.</div>
          )}
        </>
      )}

      {/* MODAL Aperçu */}
      {showPreviewTemplate && (
        <div
          className="fixed z-50 inset-0 bg-black/30 flex justify-center items-center"
          onClick={() => setShowPreviewTemplate(null)}
        >
          <div
            className="bg-white rounded-lg p-6 shadow-lg max-w-lg w-full relative"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setShowPreviewTemplate(null)}
              className="absolute top-2 right-2 text-gray-400 text-lg"
            >×</button>
            <h4 className="font-bold text-xl mb-2">{showPreviewTemplate.name}</h4>
            <div className="text-sm text-gray-600 mb-2">
              <CategoryBadge value={showPreviewTemplate.category} />
            </div>
            <div className="mb-2">{showPreviewTemplate.description || <em className="text-gray-400">Aucune description</em>}</div>
            <div className="mt-3 text-xs text-gray-500">
              <strong>ID :</strong> {showPreviewTemplate.id}
            </div>
            <div className="mt-2 text-xs text-gray-500">
              <strong>Data :</strong><br />
              <pre className="rounded bg-muted/50 p-2">
                {JSON.stringify(showPreviewTemplate.templateData || {}, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
