import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type StatusType = "sell" | "buy" | "announce";

export interface WaouhStatus {
  id: string;
  user_id: string;
  author_name: string | null;
  author_avatar_url: string | null;
  type: StatusType;
  title: string;
  caption: string | null;
  price_fcfa: number | null;
  location: string | null;
  media_url: string | null;
  media_kind: "image" | "video" | null;
  article_id: string | null;
  waouh_code: string | null;
  views_count: number;
  expires_at: string;
  created_at: string;
}

export interface PublishStatusInput {
  type: StatusType;
  title: string;
  caption?: string;
  price_fcfa?: number;
  location?: string;
  article_id?: string;
  waouh_code?: string;
  media_file?: File | null;
}

export function useStatuses(filter?: StatusType | "all") {
  const [statuses, setStatuses] = useState<WaouhStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    let q = supabase
      .from("waouh_statuses")
      .select("*")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(100);
    if (filter && filter !== "all") q = q.eq("type", filter);
    const { data } = await q;
    setStatuses((data ?? []) as WaouhStatus[]);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("waouh-statuses-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "waouh_statuses" },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [load]);

  const publishStatus = useCallback(async (input: PublishStatusInput) => {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) throw new Error("Connectez-vous pour publier un statut");

    let media_url: string | null = null;
    let media_kind: "image" | "video" | null = null;
    if (input.media_file) {
      const ext = input.media_file.name.split(".").pop() || "bin";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("waouh-statuses")
        .upload(path, input.media_file, { upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("waouh-statuses").getPublicUrl(path);
      media_url = pub.publicUrl;
      media_kind = input.media_file.type.startsWith("video") ? "video" : "image";
    }

    const { error } = await supabase.from("waouh_statuses").insert({
      user_id: user.id,
      author_name: user.user_metadata?.full_name ?? user.email ?? null,
      author_avatar_url: user.user_metadata?.avatar_url ?? null,
      type: input.type,
      title: input.title,
      caption: input.caption ?? null,
      price_fcfa: input.price_fcfa ?? null,
      location: input.location ?? null,
      article_id: input.article_id ?? null,
      waouh_code: input.waouh_code ?? null,
      media_url,
      media_kind,
    });
    if (error) throw error;
    await load();
  }, [load]);

  const deleteStatus = useCallback(async (id: string) => {
    await supabase.from("waouh_statuses").delete().eq("id", id);
    await load();
  }, [load]);

  return { statuses, loading, publishStatus, deleteStatus, reload: load };
}

export function expiresInLabel(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "Expiré";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h >= 1) return `${h}h restantes`;
  return `${m}min restantes`;
}
