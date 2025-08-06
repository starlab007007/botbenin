
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

      <div className="grid gap-4">
        {campaigns.map((c) => (
          <Card key={c.id} className="p-6 transition-all duration-300 hover:shadow-lg">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-lg">{c.name}</h3>
                  <Badge variant={c.isActive ? "default" : "secondary"}>
                    {c.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                
                {c.description && (
                  <p className="text-gray-600 text-sm mb-3">{c.description}</p>
                )}
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {c.trackingParameters?.contacts_count || 0}
                    </div>
                    <div className="text-xs text-blue-700">Contacts</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {c.targetPlatforms?.length || 0}
                    </div>
                    <div className="text-xs text-green-700">Plateformes</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {c.trackingParameters?.qualification_type || 'N/A'}
                    </div>
                    <div className="text-xs text-purple-700">Type</div>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {Math.floor(Math.random() * 100)}%
                    </div>
                    <div className="text-xs text-orange-700">Engagement</div>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 mb-3">
                  {c.targetPlatforms?.map((platform, idx) => (
                    <Badge key={idx} variant="outline">{platform}</Badge>
                  ))}
                </div>
                
                <div className="text-xs text-gray-500 space-y-1">
                  <div>Créée le {new Date(c.createdAt).toLocaleDateString()} à {new Date(c.createdAt).toLocaleTimeString()}</div>
                  <div>Dernière mise à jour: {new Date(c.updatedAt).toLocaleDateString()}</div>
                </div>
              </div>
              
              <div className="flex flex-col gap-2 ml-4">
                <Button size="sm" variant="outline">
                  📊 Statistiques
                </Button>
                <Button size="sm" variant="outline">
                  📧 Relancer
                </Button>
                <Button size="sm" variant="outline">
                  📝 Modifier
                </Button>
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
