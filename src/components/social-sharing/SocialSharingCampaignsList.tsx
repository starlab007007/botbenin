
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useSocialSharingCampaigns } from "@/hooks/useSocialSharingCampaigns";
import { useToast } from "@/hooks/use-toast";
import { Plus, CheckCircle2, Settings, Sparkles, Image as ImageIcon, Loader2, X } from "lucide-react";
import { AdvancedCampaignDashboard } from "./AdvancedCampaignDashboard";
import { ImageUploader } from "./ImageUploader";
import { supabase } from "@/integrations/supabase/client";

const initialForm = { name: "", description: "", customMessage: "", platforms: [] as string[] };

const PLATFORMS = [
  { name: "WhatsApp", key: "whatsapp", color: "bg-green-100 text-green-700", icon: "💬" },
  { name: "Telegram", key: "telegram", color: "bg-blue-100 text-blue-700", icon: "📢" },
  { name: "Facebook", key: "facebook", color: "bg-blue-50 text-blue-700", icon: "🌐" },
  { name: "Messenger", key: "messenger", color: "bg-blue-200 text-blue-900", icon: "💬" },
  { name: "Twitter/X", key: "twitter", color: "bg-neutral-100 text-black", icon: "🐦" },
  { name: "LinkedIn", key: "linkedin", color: "bg-blue-50 text-blue-800", icon: "💼" },
  { name: "TikTok", key: "tiktok", color: "bg-black text-white", icon: "🎵" },
  { name: "Instagram", key: "instagram", color: "bg-pink-100 text-pink-700", icon: "📸" },
];

export const SocialSharingCampaignsList: React.FC = () => {
  const { campaigns, isLoading, createCampaign, fetchCampaigns } = useSocialSharingCampaigns();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);

  // Upload de vignettes/images
  const [previewImageFiles, setPreviewImageFiles] = useState<(File | null)[]>([null, null, null]);
  const [previewImageUrls, setPreviewImageUrls] = useState<(string | null)[]>([null, null, null]);
  const [isUploading, setIsUploading] = useState(false);

  const [justAdded, setJustAdded] = useState<string | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(f => ({
      ...f,
      [e.target.name]: e.target.value,
    }));
  };

  const handlePlatformsChange = (key: string) => {
    setForm(f => ({
      ...f,
      platforms: f.platforms.includes(key)
        ? f.platforms.filter(p => p !== key)
        : [...f.platforms, key],
    }));
  };

  // Upload selected preview images to Supabase bucket & fill URLs
  const handleUploadPreviewImages = async (files: File[]) => {
    setIsUploading(true);
    const uploaded: (string | null)[] = [null, null, null];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split('.').pop();
      const fileName = `${Date.now()}_preview_${i}.${ext}`;
      const filePath = `campaign_previews/${fileName}`;
      const { error } = await supabase.storage.from("public-media").upload(filePath, file, { upsert: true });
      if (!error) {
        const { data } = supabase.storage.from("public-media").getPublicUrl(filePath);
        uploaded[i] = data.publicUrl;
      } else {
        uploaded[i] = null;
        toast({ title: `Erreur upload vignette #${i + 1}`, variant: "destructive" });
      }
    }
    setPreviewImageUrls(uploaded);
    setIsUploading(false);
  };

  const handleFormImagesChange = (filesArr: (File | null)[], urlsArr: (string | null)[]) => {
    setPreviewImageFiles(filesArr);
    setPreviewImageUrls(urlsArr);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) {
      toast({title: "Nom requis", description: "Donnez un nom à la campagne.", variant: "destructive"});
      return;
    }
    if (previewImageFiles.some((f, i) => f && !previewImageUrls[i])) {
      toast({ title: "Veuillez uploader toutes les vignettes", variant: "destructive" });
      return;
    }
    const filteredUrls = previewImageUrls.filter(Boolean).slice(0, 3) as string[];
    // Enregistrer avec previewImages, plateformes, et customMessage
    const res = await createCampaign({
      name: form.name,
      description: form.description,
      previewImages: filteredUrls,
      targetPlatforms: form.platforms,
      customMessage: form.customMessage
    });
    setForm(initialForm);
    setPreviewImageFiles([null, null, null]);
    setPreviewImageUrls([null, null, null]);
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
        <Card className="mb-4 p-6 max-w-2xl mx-auto">
          <h3 className="text-xl font-semibold mb-4">Créer une Campagne Personnalisée</h3>
          <form onSubmit={handleCreate}>
            {/* Nom de la campagne */}
            <div className="mb-3">
              <label className="block text-xs font-medium mb-1">Nom de la campagne</label>
              <Input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Ex: Lancement Bot Restaurant"
                required
                autoFocus
              />
            </div>
            {/* Description */}
            <div className="mb-3">
              <label className="block text-xs font-medium mb-1">Description</label>
              <Input
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Description de la campagne..."
              />
            </div>
            {/* Plateformes cibles */}
            <div className="mb-3">
              <label className="block text-xs font-medium mb-1">Plateformes cibles</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PLATFORMS.map(platform => (
                  <button
                    type="button"
                    key={platform.key}
                    className={`flex items-center justify-center rounded border px-2 py-2 gap-2 text-xs transition ring-1 ${
                      form.platforms.includes(platform.key) ? "ring-2 border-primary bg-primary/10" : "border-muted"
                    } ${platform.color}`}
                    onClick={() => handlePlatformsChange(platform.key)}
                  >
                    <span>{platform.icon}</span>
                    {platform.name}
                  </button>
                ))}
              </div>
            </div>
            {/* Vignettes / Images */}
            <div className="mb-3">
              <label className="block text-xs font-medium mb-1 flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Vignettes de campagne (maxi 3)
              </label>
              <ImageUploader
                max={3}
                files={previewImageFiles}
                urls={previewImageUrls}
                isUploading={isUploading}
                onChange={handleFormImagesChange}
                onUpload={handleUploadPreviewImages}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Ajoutez jusqu'à 3 images de vignette (format carré recommandé pour l'aperçu).
              </p>
            </div>
            {/* Message personnalisé */}
            <div className="mb-3">
              <label className="block text-xs font-medium mb-1">Message personnalisé</label>
              <textarea
                name="customMessage"
                value={form.customMessage}
                onChange={handleChange}
                className="block w-full border rounded px-2 py-1 min-h-[60px] text-sm"
                placeholder="Votre message à partager, liens, mentions, etc."
              />
              <span className="text-xs text-muted-foreground mt-1 block">
                Le lien raccourci sera automatiquement ajouté à la fin du message
              </span>
            </div>
            <div className="flex space-x-2 mt-4">
              <Button type="submit" disabled={isUploading}>
                {isUploading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
                Créer la Campagne
              </Button>
              <Button type="button" variant="outline" onClick={() => {
                setShowForm(false);
                setForm(initialForm);
                setPreviewImageFiles([null, null, null]);
                setPreviewImageUrls([null, null, null]);
              }}>Annuler</Button>
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
              <div className="flex items-center font-semibold gap-2">
                {Array.isArray(c.previewImages) && c.previewImages.length > 0 && (
                  <div className="flex gap-1">
                    {c.previewImages
                      .filter(url => !!url)
                      .slice(0, 3)
                      .map((url, i) => (
                        <img
                          key={url + i}
                          src={url}
                          alt={`preview-img-${i+1}`}
                          className="object-cover rounded-md border w-9 h-9"
                          style={{ aspectRatio: "1/1", maxWidth: 36, maxHeight: 36 }}
                          onError={e => (e.currentTarget.style.display = "none")}
                        />
                      ))}
                  </div>
                )}
                <span>{c.name}</span>
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
            <div className="mt-1 flex flex-wrap gap-1">
              {(c.targetPlatforms || []).map((p: string) => (
                <span key={p} className="px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-700">{PLATFORMS.find(pl => pl.key === p)?.name || p}</span>
              ))}
            </div>
          </Card>
        ))}
        {isLoading && <div className="text-gray-500">Chargement...</div>}
        {!isLoading && campaigns.length === 0 && <div className="text-gray-400">Aucune campagne pour l'instant.</div>}
      </div>
    </div>
  );
};
