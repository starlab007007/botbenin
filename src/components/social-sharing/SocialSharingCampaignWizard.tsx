import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useSocialSharingCampaigns } from "@/hooks/useSocialSharingCampaigns";
import { useToast } from "@/hooks/use-toast";
import { ImageUploader } from "./ImageUploader";
import { Loader2 } from "lucide-react";

// Sous-composants étape
const CampaignCreationStep = ({ data, setData, onNext }: any) => (
  <form
    onSubmit={e => { e.preventDefault(); onNext(); }}
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
    <div>
      <label className="block text-xs font-medium mb-1">Description</label>
      <Textarea
        value={data.description}
        onChange={e => setData((d: any) => ({ ...d, description: e.target.value }))}
        rows={2}
        placeholder="Description de la campagne"
      />
    </div>
    <div className="text-end">
      <Button type="submit">Suivant</Button>
    </div>
  </form>
);

const CampaignPersonalizationStep = ({ data, setData, onPrev, onNext, previewImageFiles, setPreviewImageFiles, previewImageUrls, setPreviewImageUrls, isUploading, onUpload }: any) => {
  // Plateformes
  const PLATFORMS = [
    { name: "WhatsApp", key: "whatsapp", icon: "💬" },
    { name: "Telegram", key: "telegram", icon: "📢" },
    { name: "Facebook", key: "facebook", icon: "🌐" },
    { name: "Messenger", key: "messenger", icon: "💬" },
    { name: "Twitter/X", key: "twitter", icon: "🐦" },
    { name: "LinkedIn", key: "linkedin", icon: "💼" },
    { name: "TikTok", key: "tiktok", icon: "🎵" },
    { name: "Instagram", key: "instagram", icon: "📸" },
  ];
  const handlePlatformsChange = (key: string) => {
    setData((f: any) => ({
      ...f,
      platforms: f.platforms?.includes(key)
        ? f.platforms.filter((p: string) => p !== key)
        : [...(f.platforms || []), key],
    }));
  };

  return (
    <form onSubmit={e => { e.preventDefault(); onNext(); }} className="space-y-4">
      {/* Vignettes */}
      <div>
        <label className="block text-xs font-medium mb-1">Vignettes (3 max)</label>
        <ImageUploader
          max={3}
          files={previewImageFiles}
          urls={previewImageUrls}
          isUploading={isUploading}
          onChange={(filesArr: any, urlsArr: any) => {
            setPreviewImageFiles(filesArr);
            setPreviewImageUrls(urlsArr);
          }}
          onUpload={onUpload}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Jusqu'à 3 images (format carré recommandé)
        </p>
      </div>
      {/* Plateformes */}
      <div>
        <label className="block text-xs font-medium mb-1">Plateformes cibles</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PLATFORMS.map(platform => (
            <button
              type="button"
              key={platform.key}
              className={`flex items-center justify-center rounded border px-2 py-2 gap-2 text-xs transition ring-1 ${
                data.platforms?.includes(platform.key) ? "ring-2 border-primary bg-primary/10" : "border-muted"
              }`}
              onClick={() => handlePlatformsChange(platform.key)}
            >
              <span>{platform.icon}</span>
              {platform.name}
            </button>
          ))}
        </div>
      </div>
      {/* Message personnalisé */}
      <div>
        <label className="block text-xs font-medium mb-1">Message personnalisé</label>
        <Textarea
          value={data.customMessage}
          onChange={e => setData((d: any) => ({ ...d, customMessage: e.target.value }))}
          rows={3}
          placeholder="Votre message à partager, liens, mentions, etc."
        />
        <span className="text-xs text-muted-foreground mt-1 block">
          Le lien raccourci sera automatiquement ajouté à la fin du message
        </span>
      </div>
      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onPrev}>Retour</Button>
        <Button type="submit">Suivant</Button>
      </div>
    </form>
  );
};

const CampaignPlanningStep = ({ data, setData, onPrev, onNext }: any) => (
  <form onSubmit={e => { e.preventDefault(); onNext(); }} className="space-y-4">
    {/* Démo pour horaire, à adapter en vrai */}
    <div>
      <label className="block text-xs font-medium mb-1">Date de planification</label>
      <Input
        type="date"
        value={data.scheduleDate || ""}
        onChange={e => setData((d: any) => ({ ...d, scheduleDate: e.target.value }))}
      />
    </div>
    <div className="flex justify-between">
      <Button type="button" variant="outline" onClick={onPrev}>Retour</Button>
      <Button type="submit">Suivant</Button>
    </div>
  </form>
);

const CampaignSummaryStep = ({ data, previewImageUrls, onPrev, onFinish, isLoading }: any) => (
  <div className="space-y-5">
    <div>
      <div className="font-bold text-base">Récapitulatif</div>
      <div>
        <strong>Nom :</strong> {data.name}
      </div>
      {data.description && <div>
        <strong>Description :</strong> {data.description}
      </div>}
      {(previewImageUrls || []).filter(Boolean).length > 0 && (
        <div>
          <strong>Vignettes :</strong>
          <div className="flex gap-2 mt-1">
            {previewImageUrls.filter(Boolean).map((url: string, i: number) => (
              <img key={url + i} src={url} alt={"preview-" + i} className="w-12 h-12 object-cover rounded border" />
            ))}
          </div>
        </div>
      )}
      <div>
        <strong>Plateformes :</strong>{" "}
        {(data.platforms || []).length
          ? data.platforms.join(", ")
          : <span className="italic text-gray-400">Aucune</span>
        }
      </div>
      {data.customMessage && <div>
        <strong>Message :</strong>
        <div className="whitespace-pre-wrap">{data.customMessage}</div>
      </div>}
    </div>
    <div className="flex justify-between">
      <Button type="button" variant="outline" onClick={onPrev}>Retour</Button>
      <Button onClick={onFinish} disabled={isLoading}>
        {isLoading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
        Valider et créer
      </Button>
    </div>
  </div>
);

// Wizard principal
export const SocialSharingCampaignWizard: React.FC<{
  onClose: () => void;
  afterCreate?: () => void;
}> = ({ onClose, afterCreate }) => {
  const { createCampaign, fetchCampaigns } = useSocialSharingCampaigns();
  const { toast } = useToast();
  const [step, setStep] = useState(0);

  // Partagé entre étapes
  const [data, setData] = useState<any>({
    name: "", description: "", customMessage: "", platforms: [], scheduleDate: null
  });
  const [previewImageFiles, setPreviewImageFiles] = useState<(File|null)[]>([null, null, null]);
  const [previewImageUrls, setPreviewImageUrls] = useState<(string|null)[]>([null, null, null]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleUploadPreviewImages = async (filesArr: File[]) => {
    setIsUploading(true);
    const uploaded: (string|null)[] = [null, null, null];
    for (let i = 0; i < filesArr.length; i++) {
      const file = filesArr[i];
      if (!file) continue;
      const ext = file.name.split('.').pop();
      const fileName = `${Date.now()}_preview_${i}.${ext}`;
      const filePath = `campaign_previews/${fileName}`;
      const { error } = await import("@/integrations/supabase/client").then(({ supabase }) =>
        supabase.storage.from("public-media").upload(filePath, file, { upsert: true })
      );
      if (!error) {
        const { data } = await import("@/integrations/supabase/client").then(({ supabase }) =>
          supabase.storage.from("public-media").getPublicUrl(filePath)
        );
        uploaded[i] = data.publicUrl;
      } else {
        uploaded[i] = null;
        toast({ title: `Erreur upload vignette #${i + 1}`, variant: "destructive" });
      }
    }
    setPreviewImageUrls(uploaded);
    setIsUploading(false);
  };

  const stepLabels = ["Création", "Personnalisation", "Planification", "Résumé"];

  // Etapes séparées pour la réutilisabilité
  const steps = [
    <CampaignCreationStep key="c0" data={data} setData={setData} onNext={() => setStep(s => s + 1)} />,
    <CampaignPersonalizationStep
      key="c1"
      data={data}
      setData={setData}
      onPrev={() => setStep(s => s - 1)}
      onNext={() => setStep(s => s + 1)}
      previewImageFiles={previewImageFiles}
      setPreviewImageFiles={setPreviewImageFiles}
      previewImageUrls={previewImageUrls}
      setPreviewImageUrls={setPreviewImageUrls}
      isUploading={isUploading}
      onUpload={handleUploadPreviewImages}
    />,
    <CampaignPlanningStep
      key="c2"
      data={data}
      setData={setData}
      onPrev={() => setStep(s => s - 1)}
      onNext={() => setStep(s => s + 1)}
    />,
    <CampaignSummaryStep
      key="c3"
      data={data}
      previewImageUrls={previewImageUrls}
      onPrev={() => setStep(s => s - 1)}
      onFinish={async () => {
        // Validation finale
        if (!data.name) {
          toast({ title: "Nom requis", variant: "destructive" });
          setStep(0);
          return;
        }
        if (previewImageFiles.some((f, i) => f && !previewImageUrls[i])) {
          toast({ title: "Veuillez uploader toutes les vignettes", variant: "destructive" });
          setStep(1);
          return;
        }
        setIsLoading(true);
        const filteredUrls = previewImageUrls.filter(Boolean).slice(0, 3) as string[];
        await createCampaign({
          name: data.name,
          description: data.description,
          previewImages: filteredUrls,
          targetPlatforms: data.platforms,
          customMessage: data.customMessage
        });
        await fetchCampaigns();
        setIsLoading(false);
        toast({ title: "Campagne créée", description: "Votre campagne a été ajoutée." });
        afterCreate && afterCreate();
        onClose();
      }}
      isLoading={isLoading}
    />
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 animate-fade-in">
      <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 relative">
        <button className="absolute top-2 right-2 text-gray-400 text-lg" onClick={onClose}>×</button>
        <div className="mb-2 flex gap-2">
          {stepLabels.map((lbl, i) =>
            <div
              key={lbl}
              className={`flex-1 text-xs text-center px-1 py-1 rounded-t ${
                i < step ? "bg-primary/70 text-white" :
                i === step ? "bg-primary text-white font-medium" :
                "bg-muted/40 text-gray-400"
              } transition`}
            >
              {lbl}
            </div>
          )}
        </div>
        <Card className="p-5">
          {steps[step]}
        </Card>
      </div>
    </div>
  );
};
