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
    const { data, error } = await supabase
      .from("social_sharing_campaigns")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) setError(error);

    setCampaigns(Array.isArray(data) ? data.map(mapDbRowToCampaign) : []);
    setIsLoading(false);
  }

  async function createCampaign(data: Partial<SocialSharingCampaign> & { botId?: string }) {
    setIsLoading(true);
    setError(null);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      setError("Vous devez être connecté.");
      setIsLoading(false);
      return null;
    }
    // fill required owner_id from current user
    const dbInsert = mapCampaignToDbInsert({
      ...data,
      ownerId: userData.user.id,
    });

    const { data: inserted, error: insertError } = await supabase
      .from("social_sharing_campaigns")
      .insert([dbInsert])
      .select("*")
      .maybeSingle();

    if (insertError) setError(insertError);

    if (inserted) setCampaigns((arr) => [mapDbRowToCampaign(inserted), ...arr]);
    setIsLoading(false);
    return inserted ? mapDbRowToCampaign(inserted) : null;
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
