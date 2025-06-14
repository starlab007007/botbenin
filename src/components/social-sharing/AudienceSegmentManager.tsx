
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useAdvancedCampaignFeatures } from "@/hooks/useAdvancedCampaignFeatures";
import { useToast } from "@/hooks/use-toast";
import { Plus, Users, Target, TrendingUp } from "lucide-react";

export const AudienceSegmentManager: React.FC = () => {
  const { audienceSegments, createAudienceSegment, isLoading } = useAdvancedCampaignFeatures();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    platforms: [] as string[],
    segmentCriteria: {}
  });

  const platforms = [
    { id: "facebook", label: "Facebook" },
    { id: "instagram", label: "Instagram" },
    { id: "twitter", label: "Twitter/X" },
    { id: "linkedin", label: "LinkedIn" },
    { id: "tiktok", label: "TikTok" },
    { id: "youtube", label: "YouTube" }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) {
      toast({ title: "Nom requis", variant: "destructive" });
      return;
    }

    const result = await createAudienceSegment({
      ...form,
      estimatedSize: Math.floor(Math.random() * 10000) + 1000, // Simulation
    });

    if (result) {
      setForm({ name: "", description: "", platforms: [], segmentCriteria: {} });
      setShowForm(false);
      toast({ title: "Segment créé", description: "Votre segment d'audience a été créé." });
    }
  };

  const handlePlatformChange = (platformId: string, checked: boolean) => {
    setForm(f => ({
      ...f,
      platforms: checked 
        ? [...f.platforms, platformId]
        : f.platforms.filter(p => p !== platformId)
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold flex items-center">
          <Users className="w-5 h-5 mr-2" />
          Segments d'Audience
        </h3>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-2" />
          Nouveau Segment
        </Button>
      </div>

      {showForm && (
        <Card className="p-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nom du segment*</label>
              <Input
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Jeunes professionnels 25-35 ans"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Décrivez les caractéristiques de ce segment..."
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Plateformes cibles</label>
              <div className="grid grid-cols-2 gap-2">
                {platforms.map(platform => (
                  <div key={platform.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={platform.id}
                      checked={form.platforms.includes(platform.id)}
                      onCheckedChange={(checked) => handlePlatformChange(platform.id, !!checked)}
                    />
                    <label htmlFor={platform.id} className="text-sm">
                      {platform.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex space-x-2">
              <Button type="submit">Créer le segment</Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Annuler
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {audienceSegments.map((segment) => (
          <Card key={segment.id} className="p-4">
            <div className="flex justify-between items-start mb-3">
              <h4 className="font-semibold flex items-center">
                <Target className="w-4 h-4 mr-2 text-blue-500" />
                {segment.name}
              </h4>
              <span className={`px-2 py-1 rounded text-xs ${
                segment.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {segment.isActive ? 'Actif' : 'Inactif'}
              </span>
            </div>

            <p className="text-sm text-gray-600 mb-3">{segment.description}</p>

            <div className="space-y-2">
              <div className="flex items-center text-sm">
                <Users className="w-4 h-4 mr-2 text-gray-400" />
                <span>Taille estimée: {segment.estimatedSize?.toLocaleString() || 'N/A'}</span>
              </div>
              
              <div className="flex flex-wrap gap-1">
                {segment.platforms.map(platform => (
                  <span key={platform} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                    {platforms.find(p => p.id === platform)?.label || platform}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-3 pt-3 border-t flex justify-between items-center text-xs text-gray-500">
              <span>Créé le {new Date(segment.createdAt).toLocaleDateString()}</span>
              <Button size="sm" variant="ghost">
                <TrendingUp className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {isLoading && <div className="text-center text-gray-500">Chargement...</div>}
      {!isLoading && audienceSegments.length === 0 && (
        <div className="text-center text-gray-400 py-8">
          Aucun segment d'audience. Créez votre premier segment pour commencer le ciblage.
        </div>
      )}
    </div>
  );
};
