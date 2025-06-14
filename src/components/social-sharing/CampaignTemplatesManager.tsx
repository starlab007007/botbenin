
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
    toast({ title: "Suppression non implémentée", description: "En démo: suppression locale." });
  };

  // Badge Catégorie
  const CategoryBadge = ({ value }: { value: string }) => (
    <span className="bg-gray-100 px-2 py-0.5 text-xs rounded text-gray-700 mr-1">{CATEGORIES.find(c => c.value === value)?.label || value}</span>
  );

  return (
    <div className="space-y-4">
      {/* Le header et sous-titre sont gérés en haut de page */}
      {/* TABS plus discrets et compacts */}
      <div>
        <div className="flex gap-2 flex-wrap border-b bg-white mb-2 px-1">
          {TABS.map(t => (
            <button
              key={t.key}
              className={`flex items-center rounded-t px-3 py-1.5 text-sm font-medium border transition ${
                activeTab === t.key ?
                  "bg-white border-x border-t border-b-0 border-primary text-primary font-semibold" :
                  "bg-muted/50 text-gray-600 border-transparent hover:bg-white/85"
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

      {activeTab === "templates" && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-base font-semibold text-gray-800">Templates de Campagne</h3>
            <Button onClick={() => setShowForm(!showForm)} size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Nouveau Template
            </Button>
          </div>

          {/* Formulaire plus léger */}
          {showForm && (
            <Card className="p-4 max-w-md mx-auto mb-3">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium mb-1">Nom*</label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Description</label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Catégorie</label>
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
                  <Button type="submit" size="sm">Créer</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>Annuler</Button>
                </div>
              </form>
            </Card>
          )}

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <Card
                key={template.id}
                className="p-4 flex flex-col justify-between"
                style={{minHeight: 130}}
              >
                <div className="flex justify-between mb-2">
                  <h4 className="font-medium text-sm">{template.name}</h4>
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
                <div className="mb-2 text-xs text-gray-700">{template.description}</div>
                <div className="flex items-end justify-between mt-2 text-xs text-gray-600">
                  <CategoryBadge value={template.category} />
                  <span>{template.usageCount ?? 0} utilisations</span>
                </div>
              </Card>
            ))}
          </div>

          {isLoading && <div className="text-center text-gray-500 py-3">Chargement…</div>}
          {!isLoading && templates.length === 0 && (
            <div className="text-center text-gray-400 py-3">Aucun template pour l'instant.</div>
          )}
        </div>
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
            <div className="text-xs text-gray-600 mb-2">
              <CategoryBadge value={showPreviewTemplate.category} />
            </div>
            <div className="mb-2">{showPreviewTemplate.description || <em className="text-gray-400">Aucune description</em>}</div>
            <div className="mt-3 text-xs text-gray-500">
              <strong>ID :</strong> {showPreviewTemplate.id}
            </div>
            <div className="mt-2 text-xs text-gray-500">
              <strong>Data :</strong><br />
              <pre className="rounded bg-muted/50 p-2 max-h-40 overflow-auto">
                {JSON.stringify(showPreviewTemplate.templateData || {}, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
