
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bot } from '../types';

export const useBots = () => {
  const [bots, setBots] = useState<Bot[]>([]);
  const [loadingBots, setLoadingBots] = useState(true);

  useEffect(() => {
    const fetchBots = async () => {
      setLoadingBots(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return setLoadingBots(false);

      const { data: ownerData } = await supabase
        .from("bot_owners")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!ownerData) return setLoadingBots(false);

      const { data: botsData } = await supabase
        .from("bots")
        .select("id, name, is_active")
        .eq("owner_id", ownerData.id);

      setBots(botsData || []);
      setLoadingBots(false);
    };

    fetchBots();
  }, []);

  return { bots, loadingBots };
};
