import { useEffect, useState } from "react";
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
  const [profile, setProfile] = useState<MobileProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setProfile(null); setLoading(false); return; }
    let mounted = true;
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
        setProfile((created as any) ?? (insert as any));
      } else {
        setProfile(data as any);
      }
      setLoading(false);
    })();

    const ch = supabase.channel(`mobile-profile-${user.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        (p) => setProfile(p.new as any))
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(ch); };
  }, [user]);

  const update = async (patch: Partial<MobileProfile>) => {
    if (!user) return;
    await supabase.from("profiles").update(patch).eq("id", user.id);
  };

  return { profile, loading, update };
}
