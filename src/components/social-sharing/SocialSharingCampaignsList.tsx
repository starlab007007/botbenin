import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useSocialSharingCampaigns } from "@/hooks/useSocialSharingCampaigns";
import { useToast } from "@/hooks/use-toast";
import { Plus, CheckCircle2, Settings, Sparkles, Image as ImageIcon, Loader2, X } from "lucide-react";
import { AdvancedCampaignDashboard } from "./AdvancedCampaignDashboard";
import { ImageUploader } from "./ImageUploader";
import { CampaignDetailsModal } from "./CampaignDetailsModal";
import { supabase } from "@/integrations/supabase/client";
import { SocialSharingCampaignWizard } from "./SocialSharingCampaignWizard";

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
  const { campaigns, isLoading, createCampaign, fetchCampaigns, updateCampaign, deleteCampaign } = useSocialSharingCampaigns();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [showWizard, setShowWizard] = useState(false);

  // Upload de vignettes/images (centralisé pour le formulaire)
  const [previewImageFiles, setPreviewImageFiles] = useState<(File | null)[]>([null, null, null]);
  const [previewImageUrls, setPreviewImageUrls] = useState<(string | null)[]>([null, null, null]);
  const [isUploading, setIsUploading] = useState(false);

  const [justAdded, setJustAdded] = useState<string | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Pour gérer l'affichage du détail
  const [selectedDetail, setSelectedDetail] = useState<string | null>(null);

  // Pour la modification (édition)
  const [editId, setEditId] = useState<string | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);

  // Pour la suppression
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const handleEdit = (c: any) => {
    setEditId(c.id);
    setForm({
      name: c.name,
      description: c.description,
      customMessage: c.customMessage || "",
      platforms: c.targetPlatforms || [],
    });
    setPreviewImageFiles([null, null, null]);
    setPreviewImageUrls((c.previewImages || [null, null, null]).slice(0, 3));
    setShowEditForm(true);
    setShowForm(false);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId) return;
    if (!form.name) {
      toast({title: "Nom requis", description: "Donnez un nom à la campagne.", variant: "destructive"});
      return;
    }
    if (previewImageFiles.some((f, i) => f && !previewImageUrls[i])) {
      toast({ title: "Veuillez uploader toutes les vignettes", variant: "destructive" });
      return;
    }
    const filteredUrls = previewImageUrls.filter(Boolean).slice(0, 3) as string[];
    const { error } = await updateCampaign(editId, {
      name: form.name,
      description: form.description,
      previewImages: filteredUrls,
      targetPlatforms: form.platforms,
      customMessage: form.customMessage
    });
    if (!error) {
      toast({title: "Modifié", description: "La campagne a été mise à jour."});
      setShowEditForm(false);
      setEditId(null);
      setForm(initialForm);
      setPreviewImageFiles([null, null, null]);
      setPreviewImageUrls([null, null, null]);
      fetchCampaigns();
    } else {
      toast({title: "Erreur modification", description: error.message, variant: "destructive"});
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const { error } = await deleteCampaign(id);
    if (!error) {
      toast({ title: "Supprimée", description: "La campagne a été supprimée." });
      fetchCampaigns();
      setDeletingId(null);
      setShowEditForm(false);
    } else {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      setDeletingId(null);
    }
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

  const selectedCampaignObj = campaigns.find(c => c.id === selectedDetail) || null;

  return (
    <div>
      {/* Wizard modal */}
      {showWizard &&
        <SocialSharingCampaignWizard
          onClose={() => setShowWizard(false)}
          afterCreate={() => setShowWizard(false)}
        />
      }
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
        <Button onClick={() => setShowWizard(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle campagne
        </Button>
      </div>

      <div className="grid gap-3">
        {campaigns.map((c) => (
          <Card
            key={c.id}
            className={`p-4 transition-all duration-300 flex flex-col justify-between ${justAdded === c.id ? 'border-green-500 bg-green-50' : ''}`}
          >
            <div className="flex items-center justify-between gap-2">
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
                <span className="font-medium">{c.name}</span>
                {justAdded === c.id && <CheckCircle2 className="ml-2 text-green-600 w-4 h-4" />}
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  title="Voir les détails"
                  onClick={() => setSelectedDetail(c.id)}
                >
                  <Sparkles className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEdit(c)}
                  title="Modifier"
                >
                  <Settings className="w-4 h-4 mr-1" />
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
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleAdvancedFeatures(c.id)}
                >
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
      <CampaignDetailsModal
        open={!!selectedDetail}
        campaign={selectedCampaignObj}
        onClose={() => setSelectedDetail(null)}
      />
    </div>
  );
};
