// WAOUH — Identity sibling resolver.
// Une même personne peut avoir plusieurs lignes `waouh_users` :
//  - compte App (auth_user_id) + compte WhatsApp (phone_number)
//  - LID privacy (`<lid>@lid`) + phone canonique E.164
//  - doublons historiques (web sessions multiples)
//
// `resolveSiblingUserIds` retourne l'ensemble des waouh_users.id qui
// appartiennent à la même personne. Utilisé par waouh-channel-in et
// waouh-negotiation-router pour retrouver la bonne négociation même
// quand la contre-offre arrive depuis une identité différente de
// celle stockée sur `waouh_negotiations`.

export interface WaouhUserLike {
  id: string;
  auth_user_id?: string | null;
  phone_number?: string | null;
  web_session_id?: string | null;
}

function isLid(value: string | null | undefined): boolean {
  return !!value && /@lid$/i.test(value);
}

function lidPart(value: string | null | undefined): string | null {
  if (!value) return null;
  if (isLid(value)) return value.replace(/@lid$/i, "");
  return null;
}

export async function resolveSiblingUserIds(
  sb: any,
  user: WaouhUserLike | null | undefined,
): Promise<string[]> {
  const ids = new Set<string>();
  if (!user?.id) return [];
  ids.add(user.id);

  try {
    // 1) Même auth_user_id (App)
    if (user.auth_user_id) {
      const { data } = await sb
        .from("waouh_users")
        .select("id")
        .eq("auth_user_id", user.auth_user_id)
        .limit(50);
      for (const r of data || []) ids.add(r.id);
    }

    // 2) Même phone_number exact
    if (user.phone_number) {
      const { data } = await sb
        .from("waouh_users")
        .select("id")
        .eq("phone_number", user.phone_number)
        .limit(20);
      for (const r of data || []) ids.add(r.id);
    }

    // 3) LID → phone canonique (puis tous les waouh_users sur ce phone)
    //    et phone → LID (inverse).
    const phonesToExpand = new Set<string>();
    const lidsToExpand = new Set<string>();

    if (isLid(user.phone_number)) {
      const lid = lidPart(user.phone_number);
      if (lid) lidsToExpand.add(lid);
    } else if (user.phone_number) {
      phonesToExpand.add(user.phone_number);
    }

    if (lidsToExpand.size > 0) {
      const { data } = await sb
        .from("waouh_lid_phone_map")
        .select("lid, jid, phone, phone_e164, pushname")
        .in("lid", [...lidsToExpand])
        .limit(20);
      for (const r of data || []) {
        if (r.phone_e164) phonesToExpand.add(r.phone_e164);
        if (r.phone) phonesToExpand.add(r.phone);
      }
    }

    if (phonesToExpand.size > 0) {
      // Trouver tous les LIDs qui pointent vers ces phones.
      const phonesArr = [...phonesToExpand];
      const orClauses = [
        `phone.in.(${phonesArr.map((p) => `"${p}"`).join(",")})`,
        `phone_e164.in.(${phonesArr.map((p) => `"${p}"`).join(",")})`,
      ].join(",");
      const { data } = await sb
        .from("waouh_lid_phone_map")
        .select("lid")
        .or(orClauses)
        .limit(20);
      for (const r of data || []) {
        if (r.lid) lidsToExpand.add(r.lid);
      }
    }

    // 4) Charger tous les waouh_users qui matchent ces phones et LIDs.
    if (phonesToExpand.size > 0) {
      const { data } = await sb
        .from("waouh_users")
        .select("id")
        .in("phone_number", [...phonesToExpand])
        .limit(50);
      for (const r of data || []) ids.add(r.id);
    }
    if (lidsToExpand.size > 0) {
      const lidPhoneVariants = [...lidsToExpand].map((l) => `${l}@lid`);
      const { data } = await sb
        .from("waouh_users")
        .select("id")
        .in("phone_number", lidPhoneVariants)
        .limit(50);
      for (const r of data || []) ids.add(r.id);
    }
  } catch (e) {
    console.warn("[resolveSiblingUserIds] failed", e);
  }

  return [...ids];
}

/**
 * Filtre `or(buyer_user_id.in.(...),seller_user_id.in.(...))` PostgREST.
 * Renvoie une chaîne prête pour `.or(...)` dans le builder Supabase.
 */
export function siblingOrFilter(ids: string[]): string {
  const safe = ids.filter((x) => typeof x === "string" && x.length > 0);
  if (safe.length === 0) return "buyer_user_id.eq.00000000-0000-0000-0000-000000000000";
  const list = `(${safe.join(",")})`;
  return `buyer_user_id.in.${list},seller_user_id.in.${list}`;
}
