
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CampaignTemplate = {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  category: string;
  templateData: any;
  previewImage?: string;
  isPublic: boolean;
  usageCount: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export type AIGeneratedAsset = {
  id: string;
  campaignId?: string;
  assetType: 'text' | 'image' | 'hashtags' | 'variation';
  promptUsed?: string;
  generatedContent: any;
  qualityScore?: number;
  approved: boolean;
  metadata: any;
  createdAt: string;
};

export type AudienceSegment = {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  segmentCriteria: any;
  estimatedSize?: number;
  platforms: string[];
  performanceMetrics: any;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

function mapDbRowToTemplate(row: any): CampaignTemplate {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    description: row.description,
    category: row.category,
    templateData: row.template_data,
    previewImage: row.preview_image,
    isPublic: row.is_public,
    usageCount: row.usage_count,
    tags: row.tags || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDbRowToAIAsset(row: any): AIGeneratedAsset {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    assetType: row.asset_type,
    promptUsed: row.prompt_used,
    generatedContent: row.generated_content,
    qualityScore: row.quality_score,
    approved: row.approved,
    metadata: row.metadata || {},
    createdAt: row.created_at,
  };
}

function mapDbRowToAudience(row: any): AudienceSegment {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    description: row.description,
    segmentCriteria: row.segment_criteria,
    estimatedSize: row.estimated_size,
    platforms: row.platforms || [],
    performanceMetrics: row.performance_metrics || {},
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function useAdvancedCampaignFeatures() {
  const [templates, setTemplates] = useState<CampaignTemplate[]>([]);
  const [aiAssets, setAiAssets] = useState<AIGeneratedAsset[]>([]);
  const [audienceSegments, setAudienceSegments] = useState<AudienceSegment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    fetchTemplates();
    fetchAudienceSegments();
  }, []);

  async function fetchTemplates() {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("campaign_templates")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) setError(error);
    setTemplates(Array.isArray(data) ? data.map(mapDbRowToTemplate) : []);
    setIsLoading(false);
  }

  async function fetchAIAssets(campaignId?: string) {
    setIsLoading(true);
    let query = supabase.from("ai_generated_assets").select("*");
    
    if (campaignId) {
      query = query.eq("campaign_id", campaignId);
    }
    
    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) setError(error);
    setAiAssets(Array.isArray(data) ? data.map(mapDbRowToAIAsset) : []);
    setIsLoading(false);
  }

  async function fetchAudienceSegments() {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("audience_segments")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) setError(error);
    setAudienceSegments(Array.isArray(data) ? data.map(mapDbRowToAudience) : []);
    setIsLoading(false);
  }

  async function createTemplate(data: Partial<CampaignTemplate>) {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return null;

    const { data: inserted, error } = await supabase
      .from("campaign_templates")
      .insert([{
        owner_id: userData.user.id,
        name: data.name,
        description: data.description,
        category: data.category || 'general',
        template_data: data.templateData || {},
        preview_image: data.previewImage,
        is_public: data.isPublic || false,
        tags: data.tags || [],
      }])
      .select("*")
      .maybeSingle();

    if (error) {
      setError(error);
      return null;
    }

    if (inserted) {
      const newTemplate = mapDbRowToTemplate(inserted);
      setTemplates(prev => [newTemplate, ...prev]);
      return newTemplate;
    }
    return null;
  }

  async function generateAIContent(
    campaignId: string,
    assetType: 'text' | 'image' | 'hashtags' | 'variation',
    prompt: string
  ) {
    setIsLoading(true);
    setError(null);

    // Simuler la génération IA pour l'instant
    const mockContent = {
      text: { content: `Contenu généré par IA pour: ${prompt}`, tone: 'professional' },
      image: { url: '/placeholder.svg', description: `Image pour: ${prompt}` },
      hashtags: { hashtags: ['#marketing', '#social', '#campaign', '#AI'] },
      variation: { variations: [`Variation 1: ${prompt}`, `Variation 2: ${prompt}`] }
    };

    const { data: inserted, error } = await supabase
      .from("ai_generated_assets")
      .insert([{
        campaign_id: campaignId,
        asset_type: assetType,
        prompt_used: prompt,
        generated_content: mockContent[assetType],
        quality_score: Math.random() * 100,
        approved: false,
        metadata: { generated_at: new Date().toISOString() }
      }])
      .select("*")
      .maybeSingle();

    if (error) {
      setError(error);
      setIsLoading(false);
      return null;
    }

    if (inserted) {
      const newAsset = mapDbRowToAIAsset(inserted);
      setAiAssets(prev => [newAsset, ...prev]);
      setIsLoading(false);
      return newAsset;
    }
    setIsLoading(false);
    return null;
  }

  async function createAudienceSegment(data: Partial<AudienceSegment>) {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return null;

    const { data: inserted, error } = await supabase
      .from("audience_segments")
      .insert([{
        owner_id: userData.user.id,
        name: data.name,
        description: data.description,
        segment_criteria: data.segmentCriteria || {},
        estimated_size: data.estimatedSize,
        platforms: data.platforms || [],
        performance_metrics: data.performanceMetrics || {},
        is_active: data.isActive !== false,
      }])
      .select("*")
      .maybeSingle();

    if (error) {
      setError(error);
      return null;
    }

    if (inserted) {
      const newSegment = mapDbRowToAudience(inserted);
      setAudienceSegments(prev => [newSegment, ...prev]);
      return newSegment;
    }
    return null;
  }

  return {
    templates,
    aiAssets,
    audienceSegments,
    isLoading,
    error,
    fetchTemplates,
    fetchAIAssets,
    fetchAudienceSegments,
    createTemplate,
    generateAIContent,
    createAudienceSegment,
  };
}
