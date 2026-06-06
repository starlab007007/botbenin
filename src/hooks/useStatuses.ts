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
  lat: number | null;
  lng: number | null;
  media_url: string | null;
  media_kind: "image" | "video" | null;
  media_urls: string[];
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
  lat?: number;
  lng?: number;
  article_id?: string;
  waouh_code?: string;
  /** Up to 2 photos */
  media_files?: File[];
  /** @deprecated use media_files */
  media_file?: File | null;
}

const STORAGE_BUCKET = "waouh-statuses";

export function useStatuses(filter?: StatusType | "all") {
  const [statuses, setStatuses] = useState<WaouhStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    let q: any = (supabase as any)
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

    const filesToUpload: File[] = input.media_files && input.media_files.length > 0
      ? input.media_files.slice(0, 2)
      : input.media_file ? [input.media_file] : [];

    const media_urls: string[] = [];
    for (const f of filesToUpload) {
      const ext = (f.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, f, { upsert: false, contentType: f.type || "image/jpeg" });
      if (upErr) {
        if (/bucket.*not.*found/i.test(upErr.message)) {
          throw new Error("Stockage indisponible. Veuillez réessayer dans un instant.");
        }
        throw upErr;
      }
      const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
      media_urls.push(pub.publicUrl);
    }

    const { error } = await (supabase as any).from("waouh_statuses").insert({
      user_id: user.id,
      author_name: user.user_metadata?.full_name ?? user.email ?? null,
      author_avatar_url: user.user_metadata?.avatar_url ?? null,
      type: input.type,
      title: input.title,
      caption: input.caption ?? null,
      price_fcfa: input.price_fcfa ?? null,
      location: input.location ?? null,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      article_id: input.article_id ?? null,
      waouh_code: input.waouh_code ?? null,
      media_url: media_urls[0] ?? null,
      media_urls,
      media_kind: media_urls.length > 0 ? "image" : null,
    });
    if (error) throw error;
    await load();
  }, [load]);

  const deleteStatus = useCallback(async (id: string) => {
    await (supabase as any).from("waouh_statuses").delete().eq("id", id);
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
