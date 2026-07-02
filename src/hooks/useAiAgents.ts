import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AiAgent {
  id: string;
  user_id: string;
  waha_session_name: string | null;
  name: string;
  sector: string;
  agent_type?: "commerce" | "docs" | "website";
  website_url?: string | null;
  google_sheet_url?: string | null;
  paused_contacts?: string[] | null;
  persona: any;
  capabilities: any;
  system_prompt: string | null;
  status: "draft" | "training" | "testing" | "active" | "paused";
  stats: any;
  created_at: string;
  updated_at: string;
}

export function useAiAgents() {
  const [agents, setAgents] = useState<AiAgent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await (supabase as any)
      .from("waouh_ai_agents")
      .select("*")
      .order("created_at", { ascending: false });
    setAgents((data as any) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase.channel("ai_agents_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "waouh_ai_agents" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  return { agents, loading, reload: load };
}
