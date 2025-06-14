
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SocialSharingCampaign = {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  start_date: string | null;
  end_date: string | null;
  target_platforms: string[]; // Ex: ["facebook", "instagram"]
  status: string;
  settings: any;
  created_at: string;
  updated_at: string;
};

export function useSocialSharingCampaigns() {
  const [campaigns, setCampaigns] = useState<SocialSharingCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  useEffect(() => { fetchCampaigns(); }, []);
  
  async function fetchCampaigns() {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("social_sharing_campaigns")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) setError(error);
    setCampaigns(data || []);
    setIsLoading(false);
  }

  async function createCampaign(data: Partial<SocialSharingCampaign>) {
    setIsLoading(true);
    setError(null);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setError("Vous devez être connecté.");
      setIsLoading(false);
      return null;
    }
    const insertData = {
      owner_id: userData.user.id,
      name: data.name || "",
      description: data.description || "",
      start_date: data.start_date || null,
      end_date: data.end_date || null,
      target_platforms: data.target_platforms || [],
      status: "draft",
      settings: data.settings || {},
    };
    const { data: inserted, error: insertError } = await supabase
      .from("social_sharing_campaigns")
      .insert([insertData])
      .select("*")
      .single();
    if (insertError) setError(insertError);
    if (inserted) setCampaigns(arr => [inserted, ...arr]);
    setIsLoading(false);
    return inserted;
  }

  // More methods like update/delete will be added later.

  return { campaigns, isLoading, error, createCampaign, fetchCampaigns };
}
