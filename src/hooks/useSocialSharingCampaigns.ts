import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// Internal "friendly" type for campaigns (used by UI)
export type SocialSharingCampaign = {
  id: string;
  botId: string;
  ownerId: string;
  name: string;
  description: string;
  customMessage?: string | null;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  targetPlatforms: string[];
  trackingParameters: any;
  previewImages?: string[]; // NEW: up to 3 preview URLs
};

// Map a DB row (snake_case) to SocialSharingCampaign (camelCase)
function mapDbRowToCampaign(row: any): SocialSharingCampaign {
  return {
    id: row.id,
    botId: row.bot_id,
    ownerId: row.owner_id,
    name: row.campaign_name,
    description: row.campaign_description ?? "",
    customMessage: row.custom_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isActive: row.is_active ?? true,
    targetPlatforms: Array.isArray(row.target_platforms)
      ? row.target_platforms
      : Array.isArray(row.target_platforms?.[0])
      ? row.target_platforms[0]
      : row.target_platforms ?? [],
    trackingParameters: row.tracking_parameters ?? {},
    previewImages: Array.isArray(row.preview_images) ? row.preview_images : [],
  };
}

// Map camelCase campaign object to DB insert/update (snake_case)
function mapCampaignToDbInsert(
  data: Partial<SocialSharingCampaign> & { botId?: string }
) {
  return {
    bot_id: data.botId,
    owner_id: data.ownerId,
    campaign_name: data.name,
    campaign_description: data.description,
    custom_message: data.customMessage ?? "",
    is_active: data.isActive ?? true,
    target_platforms: data.targetPlatforms ?? [],
    tracking_parameters: data.trackingParameters ?? {},
    preview_images: data.previewImages ?? [],
    // DB handles timestamps
  };
}

export function useSocialSharingCampaigns() {
  const [campaigns, setCampaigns] = useState<SocialSharingCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    fetchCampaigns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchCampaigns() {
    setIsLoading(true);
    setError(null);
    
    try {
      // Récupérer l'utilisateur connecté
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        setCampaigns([]);
        setIsLoading(false);
        return;
      }

      // Récupérer l'ID du bot_owner
      const botOwnerId = await getBotOwnerId(userData.user.id);
      if (!botOwnerId) {
        setCampaigns([]);
        setIsLoading(false);
        return;
      }

      // Récupérer les campagnes via la relation bot_owners
      const { data, error } = await supabase
        .from("social_sharing_campaigns")
        .select(`
          *,
          bots!inner(
            id,
            name,
            owner_id
          )
        `)
        .eq('bots.owner_id', botOwnerId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error('Erreur récupération campagnes:', error);
        setError(error);
      }

      setCampaigns(Array.isArray(data) ? data.map(mapDbRowToCampaign) : []);
    } catch (error) {
      console.error('Erreur inattendue récupération campagnes:', error);
      setError(error);
      setCampaigns([]);
    } finally {
      setIsLoading(false);
    }
  }

  // Fonction utilitaire pour récupérer ou créer l'ID du bot_owner
  async function getBotOwnerId(userId: string): Promise<string | null> {
    // Essayer de récupérer un bot_owner existant
    let { data } = await supabase
      .from('bot_owners')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (data?.id) {
      return data.id;
    }

    // Si pas trouvé, essayer de créer un bot_owner via la fonction Supabase
    try {
      const { data: newOwnerData } = await supabase.rpc('get_or_create_bot_owner', {
        user_uuid: userId
      });
      
      if (newOwnerData) {
        return newOwnerData;
      }
    } catch (error) {
      console.error('Erreur création bot_owner:', error);
    }
    
    return null;
  }

  async function createCampaign(data: Partial<SocialSharingCampaign> & { botId?: string }) {
    setIsLoading(true);
    setError(null);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        const error = "Vous devez être connecté.";
        setError(error);
        setIsLoading(false);
        return null;
      }
      
      // Récupérer l'ID du bot_owner pour cet utilisateur
      const botOwnerId = await getBotOwnerId(userData.user.id);
      if (!botOwnerId) {
        setError("Impossible de trouver ou créer votre profil propriétaire de bot.");
        setIsLoading(false);
        return null;
      }

      // Valider que le bot_id est fourni et valide
      if (!data.botId || data.botId.trim() === '') {
        const error = "Un bot doit être sélectionné pour créer une campagne.";
        setError(error);
        setIsLoading(false);
        return null;
      }

      // Vérifier que le bot existe et appartient à l'utilisateur
      const { data: botData, error: botError } = await supabase
        .from('bots')
        .select('id')
        .eq('id', data.botId)
        .eq('owner_id', botOwnerId)
        .maybeSingle();

      if (botError || !botData) {
        console.error('Bot non trouvé ou non autorisé:', botError);
        setError("Bot non trouvé ou vous n'êtes pas autorisé à l'utiliser.");
        setIsLoading(false);
        return null;
      }
      
      // Préparer les données avec les IDs corrects
      const dbInsert = mapCampaignToDbInsert({
        ...data,
        botId: data.botId, // ID du bot validé
        ownerId: botOwnerId, // ID du bot_owner (pas l'user_id directement)
      });

      console.log('Données campagne à insérer:', dbInsert);

      const { data: inserted, error: insertError } = await supabase
        .from("social_sharing_campaigns")
        .insert([dbInsert])
        .select("*")
        .maybeSingle();

      if (insertError) {
        console.error('Erreur création campagne:', insertError);
        setError(insertError);
        setIsLoading(false);
        return null;
      }

      if (inserted) {
        setCampaigns((arr) => [mapDbRowToCampaign(inserted), ...arr]);
        setIsLoading(false);
        return mapDbRowToCampaign(inserted);
      }
      
      setIsLoading(false);
      return null;
    } catch (error) {
      console.error('Erreur inattendue:', error);
      setError(error);
      setIsLoading(false);
      return null;
    }
  }

  async function updateCampaign(id: string, data: Partial<SocialSharingCampaign>) {
    const { error, data: updated } = await supabase
      .from("social_sharing_campaigns")
      .update(mapCampaignToDbInsert(data))
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) return { error, updated: null };
    return { error: null, updated: updated ? mapDbRowToCampaign(updated) : null };
  }

  async function deleteCampaign(id: string) {
    const { error } = await supabase
      .from("social_sharing_campaigns")
      .delete()
      .eq("id", id);
    if (error) return { error };
    return { error: null };
  }

  return { campaigns, isLoading, error, createCampaign, fetchCampaigns, updateCampaign, deleteCampaign };
}
