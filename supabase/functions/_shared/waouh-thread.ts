import { resolveSiblingUserIds } from "./waouh-identity.ts";

export type WaouhThreadRole = "buyer" | "seller";

export interface WaouhThread {
  id: string;
  thread_key: string;
  article_id: string;
  buyer_user_id: string;
  seller_user_id: string;
  cycle_id: string;
  negotiation_id?: string | null;
  deal_id?: string | null;
  transaction_id?: string | null;
  status: string;
}

export interface WaouhSearchThread {
  id: string;
  thread_key: string;
  owner_user_id: string;
  search_request_id: string;
  cycle_id: string;
  status: string;
}

function unique(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => !!value))];
}

export function normalizeThreadStatus(value: string | null | undefined): string {
  const status = String(value || "active").toLowerCase();
  if (["cancelled", "canceled", "refused", "rejected"].includes(status)) return "cancelled";
  if (["completed", "concluded", "delivered"].includes(status)) return "concluded";
  if (["paid", "payment_verified"].includes(status)) return "paid";
  if (["accepted", "awaiting_payment", "seller_confirmed"].includes(status)) return "accepted";
  if (["proposed", "countered", "negotiating", "negotiation_open"].includes(status)) return "negotiating";
  return "active";
}

export async function resolveSearchThread(args: {
  sb: any;
  ownerUserId: string;
  searchRequestId: string;
  source?: string | null;
  metadata?: Record<string, any>;
}): Promise<WaouhSearchThread> {
  const { sb, ownerUserId, searchRequestId, source = null, metadata = {} } = args;
  if (!ownerUserId || !searchRequestId) throw new Error("Identité de recherche incomplète");
  const threadKey = `search:${ownerUserId}:${searchRequestId}`;
  const { data: existing } = await sb
    .from("waouh_chat_threads")
    .select("*")
    .eq("thread_key", threadKey)
    .eq("thread_type", "search")
    .maybeSingle();
  if (existing?.id) return existing as WaouhSearchThread;

  const { data: created, error } = await sb.from("waouh_chat_threads").insert({
    thread_key: threadKey,
    active_key: null,
    thread_type: "search",
    owner_user_id: ownerUserId,
    search_request_id: searchRequestId,
    cycle_id: searchRequestId,
    source,
    status: "active",
    metadata,
  }).select("*").maybeSingle();
  if (!error && created?.id) return created as WaouhSearchThread;

  const { data: raced } = await sb
    .from("waouh_chat_threads")
    .select("*")
    .eq("thread_key", threadKey)
    .maybeSingle();
  if (raced?.id) return raced as WaouhSearchThread;
  throw error ?? new Error("Impossible de créer le fil de recherche WAOUH");
}

export async function resolveSearchThreadForActor(args: {
  sb: any;
  actorUser: any;
  preferredThreadId: string;
}): Promise<WaouhSearchThread> {
  const { sb, actorUser, preferredThreadId } = args;
  const actorIds = unique(await resolveSiblingUserIds(sb, actorUser));
  const { data: thread } = await sb.from("waouh_chat_threads")
    .select("*")
    .eq("id", preferredThreadId)
    .eq("thread_type", "search")
    .maybeSingle();
  if (!thread?.id) throw new Error("Recherche Chat Meet introuvable");
  if (!actorIds.includes(thread.owner_user_id)) {
    throw new Error("Accès refusé à cette recherche Chat Meet");
  }
  return thread as WaouhSearchThread;
}

async function siblingsForId(sb: any, userId: string | null | undefined): Promise<string[]> {
  if (!userId) return [];
  const { data: user } = await sb
    .from("waouh_users")
    .select("id,auth_user_id,phone_number,web_session_id")
    .eq("id", userId)
    .maybeSingle();
  return user ? resolveSiblingUserIds(sb, user) : [userId];
}

export async function resolveProductThread(args: {
  sb: any;
  articleId: string;
  actorUser: any;
  role: WaouhThreadRole;
  counterpartUserId?: string | null;
  buyerUserId?: string | null;
  sellerUserId?: string | null;
  preferredThreadId?: string | null;
  source?: string | null;
  create?: boolean;
}): Promise<WaouhThread | null> {
  const {
    sb,
    articleId,
    actorUser,
    role,
    counterpartUserId = null,
    buyerUserId: buyerHint = null,
    sellerUserId: sellerHint = null,
    preferredThreadId = null,
    source = null,
    create = true,
  } = args;

  if (!articleId || !actorUser?.id) return null;
  const { data: article } = await sb
    .from("waouh_articles")
    .select("id,seller_id,title,price,city,photos")
    .eq("id", articleId)
    .maybeSingle();
  if (!article?.id) return null;

  const actorIds = unique(await resolveSiblingUserIds(sb, actorUser));
  const articleSellerIds = unique([
    article.seller_id,
    ...await siblingsForId(sb, article.seller_id),
  ]);
  const actorIsSeller = actorIds.some((id) => articleSellerIds.includes(id));
  if ((role === "seller" && !actorIsSeller) || (role === "buyer" && actorIsSeller)) {
    throw new Error("Rôle Chat Meet incompatible avec l'article");
  }

  if (preferredThreadId) {
    const { data: preferred } = await sb
      .from("waouh_chat_threads")
      .select("*")
      .eq("id", preferredThreadId)
      .eq("thread_type", "product_meet")
      .eq("article_id", articleId)
      .maybeSingle();
    if (!preferred?.id) throw new Error("Discussion Chat Meet introuvable pour cet article");
    const actorOnBuyerSide = actorIds.includes(preferred.buyer_user_id);
    const actorOnSellerSide = actorIds.includes(preferred.seller_user_id);
    if ((role === "buyer" && !actorOnBuyerSide) ||
        (role === "seller" && !actorOnSellerSide)) {
      throw new Error("Accès refusé à cette discussion Chat Meet");
    }
    return preferred as WaouhThread;
  }

  const sellerSeed = sellerHint || (role === "seller" ? actorUser.id : counterpartUserId) || article.seller_id;
  const buyerSeed = buyerHint || (role === "buyer" ? actorUser.id : counterpartUserId);
  if (!sellerSeed || !buyerSeed) return null;

  const sellerIds = unique([
    sellerSeed,
    ...articleSellerIds,
    ...(role === "seller" ? actorIds : await siblingsForId(sb, sellerSeed)),
  ]);
  const buyerIds = unique([
    buyerSeed,
    ...(role === "buyer" ? actorIds : await siblingsForId(sb, buyerSeed)),
  ]);

  const { data: existing } = await sb
    .from("waouh_chat_threads")
    .select("*")
    .eq("thread_type", "product_meet")
    .eq("article_id", articleId)
    .in("buyer_user_id", buyerIds)
    .in("seller_user_id", sellerIds)
    .not("status", "in", "(concluded,cancelled)")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing?.id) return existing as WaouhThread;
  if (!create) return null;

  const buyerUserId = role === "buyer" ? actorUser.id : buyerSeed;
  const sellerUserId = article.seller_id || (role === "seller" ? actorUser.id : sellerSeed);
  const relationKey = `product:${articleId}:buyer:${buyerUserId}:seller:${sellerUserId}`;
  const cycleId = crypto.randomUUID();
  const row = {
    thread_key: `${relationKey}:cycle:${cycleId}`,
    active_key: relationKey,
    thread_type: "product_meet",
    article_id: articleId,
    buyer_user_id: buyerUserId,
    seller_user_id: sellerUserId,
    cycle_id: cycleId,
    source,
    status: "active",
    metadata: {
      title: article.title,
      price: article.price,
      city: article.city,
      photos: article.photos,
    },
  };
  const { data: created, error } = await sb
    .from("waouh_chat_threads")
    .insert(row)
    .select("*")
    .maybeSingle();
  if (!error && created?.id) return created as WaouhThread;

  // Une requête concurrente peut avoir créé la même relation active.
  const { data: raced } = await sb
    .from("waouh_chat_threads")
    .select("*")
    .eq("active_key", relationKey)
    .maybeSingle();
  if (raced?.id) return raced as WaouhThread;
  throw error ?? new Error("Impossible de créer la discussion WAOUH Chat Meet");
}

export async function bindThreadState(sb: any, threadId: string | null | undefined, patch: {
  status?: string;
  negotiation_id?: string | null;
  deal_id?: string | null;
  transaction_id?: string | null;
}) {
  if (!threadId) return;
  const status = patch.status == null ? undefined : normalizeThreadStatus(patch.status);
  const finalState = status === "concluded" || status === "cancelled";
  await sb.from("waouh_chat_threads").update({
    ...patch,
    ...(status ? { status } : {}),
    ...(finalState ? { active_key: null, closed_at: new Date().toISOString() } : {}),
    updated_at: new Date().toISOString(),
  }).eq("id", threadId);
}
