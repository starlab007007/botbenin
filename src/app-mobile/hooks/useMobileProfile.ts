import {scopedRealtimeChannel} from '@/lib/waouh/realtimeChannel';
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMobileAuth } from "./useMobileAuth";

export type MobileProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
};

export function useMobileProfile() {
  const { user } = useMobileAuth();
  const currentOwner = useRef(user?.id ?? null);
  currentOwner.current = user?.id ?? null;
  const [profile, setProfile] = useState<MobileProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setProfile(null); setLoading(false); return; }
    let mounted = true;
    setLoading(true);setProfile(null);
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id,full_name,email,phone,avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (!mounted) return;

      if (!data) {
        // Auto-create row for first WhatsApp-OTP login
        const phone = user.phone ?? (user.email?.match(/^wa_(\d+)@/)?.[1] ?? null);
        const insert = {
          id: user.id,
          email: user.email ?? null,
          phone: phone ? `+${phone.replace(/^\+/, "")}` : null,
          full_name: user.user_metadata?.full_name ?? (phone ? `+${phone}` : "Utilisateur"),
          provider: phone ? "whatsapp" : "email",
        };
        const { data: created } = await supabase.from("profiles").insert(insert).select().maybeSingle();
        if (!mounted) return;
        setProfile((created as any) ?? (insert as any));
      } else {
        setProfile(data as any);
      }
      setLoading(false);
    })().catch(() => { if (mounted) setLoading(false); });

    const ch = scopedRealtimeChannel(`mobile-profile-${user.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        (p) => { if (mounted) setProfile(p.new as any); })
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(ch); };
  }, [user?.id]);

  const update = async (patch: Partial<MobileProfile>) => {
    if (!user) throw new Error("auth_required");
    const ownerId = user.id;
    const { data, error } = await supabase.from("profiles").update(patch).eq("id", ownerId)
      .select("id,full_name,email,phone,avatar_url").maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("profile_not_updated");
    if (currentOwner.current !== ownerId) throw new Error("account_changed");
    setProfile(data as MobileProfile);
  };

  return { profile, loading, update };
}
