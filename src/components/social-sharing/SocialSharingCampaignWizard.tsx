
import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSocialSharingCampaigns } from "@/hooks/useSocialSharingCampaigns";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

// Étape unique simplifiée
const CampaignCreationStep = ({ data, setData, onFinish, isLoading }: any) => (
  <form
    onSubmit={e => { e.preventDefault(); onFinish(); }}
    className="space-y-4"
  >
    <div>
      <label className="block text-xs font-medium mb-1">Nom de la campagne*</label>
      <Input
        value={data.name}
        onChange={e => setData((d: any) => ({ ...d, name: e.target.value }))}
        required
        placeholder="Nom"
      />
    </div>
    <div className="text-end">
      <Button type="submit" disabled={isLoading}>
        {isLoading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
        Créer
      </Button>
    </div>
  </form>
);

// Wizard simplifié
export const SocialSharingCampaignWizard: React.FC<{
  onClose: () => void;
  afterCreate?: () => void;
}> = ({ onClose, afterCreate }) => {
  const { createCampaign, fetchCampaigns } = useSocialSharingCampaigns();
  const { toast } = useToast();
  const [data, setData] = useState<any>({ name: "" });
  const [isLoading, setIsLoading] = useState(false);

  const handleFinish = async () => {
    if (!data.name) {
      toast({ title: "Nom requis", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    await createCampaign({
      name: data.name,
      description: "",
      previewImages: [],
      targetPlatforms: [],
      customMessage: ""
    });
    await fetchCampaigns();
    setIsLoading(false);
    toast({ title: "Campagne créée", description: "Votre campagne a été ajoutée." });
    afterCreate && afterCreate();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 animate-fade-in">
      <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 relative">
        <button className="absolute top-2 right-2 text-gray-400 text-lg" onClick={onClose}>×</button>
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Nouvelle campagne</h3>
        </div>
        <Card className="p-5">
          <CampaignCreationStep 
            data={data} 
            setData={setData} 
            onFinish={handleFinish}
            isLoading={isLoading}
          />
        </Card>
      </div>
    </div>
  );
};
