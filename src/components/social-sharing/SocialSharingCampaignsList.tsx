
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSocialSharingCampaigns } from "@/hooks/useSocialSharingCampaigns";
import { useToast } from "@/hooks/use-toast";
import { Plus, X } from "lucide-react";
import { SocialSharingCampaignWizard } from "./SocialSharingCampaignWizard";

export const SocialSharingCampaignsList: React.FC = () => {
  const { campaigns, isLoading, deleteCampaign, fetchCampaigns } = useSocialSharingCampaigns();
  const { toast } = useToast();
  const [showWizard, setShowWizard] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const { error } = await deleteCampaign(id);
    if (!error) {
      toast({ title: "Supprimée", description: "La campagne a été supprimée." });
      fetchCampaigns();
    } else {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
    setDeletingId(null);
  };

  return (
    <div>
      {showWizard && (
        <SocialSharingCampaignWizard
          onClose={() => setShowWizard(false)}
          afterCreate={() => setShowWizard(false)}
        />
      )}
      
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">Campagnes de Partage</h2>
        <Button onClick={() => setShowWizard(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle campagne
        </Button>
      </div>

      <div className="grid gap-3">
        {campaigns.map((c) => (
          <Card key={c.id} className="p-4 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div className="font-medium">{c.name}</div>
              <Button
                size="sm"
                variant="ghost"
                disabled={deletingId === c.id}
                onClick={() => {
                  if (window.confirm("Voulez-vous supprimer cette campagne ?")) {
                    handleDelete(c.id);
                  }
                }}
                title="Supprimer"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Créée le {new Date(c.createdAt).toLocaleDateString()}
            </div>
          </Card>
        ))}
        {isLoading && <div className="text-gray-500">Chargement...</div>}
        {!isLoading && campaigns.length === 0 && (
          <div className="text-gray-400">Aucune campagne pour l'instant.</div>
        )}
      </div>
    </div>
  );
};
