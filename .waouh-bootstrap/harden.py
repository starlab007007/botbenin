from pathlib import Path

def read(path):
    return Path(path).read_text()

def write(path, text):
    Path(path).write_text(text)

def replace_once(path, old, new):
    text = read(path)
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected exactly one anchor, found {count}: {old[:120]!r}")
    write(path, text.replace(old, new, 1))

# 1) Historical backfill is installed but NEVER auto-executed by migration.
path = "supabase/migrations/20260927120500_waouh_chat_messages_thread_backfill.sql"
text = read(path)
start = text.index("-- Parcours complet par curseur temporel")
end = text.index("-- Vue de suivi pour l'admin", start)
replacement = """-- IMPORTANT : aucun backfill historique n'est exécuté automatiquement par
-- cette migration. La fonction ci-dessus est volontairement installée en mode
-- manuel afin de permettre : report -> validation -> batches audités.
-- Exemple après validation :
--   SELECT public.waouh_backfill_message_threads(100, NULL);
-- puis 500, 2000, etc. Les cas ambigus restent NULL.

"""
text = text[:start] + replacement + text[end:]
old_identity = """      AND (t.buyer_user_id = m.user_id OR t.seller_user_id = m.user_id)"""
new_identity = """      AND (public.waouh_same_person(m.user_id, t.buyer_user_id)
           OR public.waouh_same_person(m.user_id, t.seller_user_id))"""
if old_identity not in text:
    raise SystemExit("backfill monitoring identity anchor missing")
text = text.replace(old_identity, new_identity, 1)
write(path, text)

# 2) Reconcile Edge Function: commission is explicit. No 5% silent fallback.
replace_once(
    "supabase/functions/waouh-chat-reconcile/index.ts",
    '  if (COMMISSION_RATE_RAW == null || COMMISSION_RATE_RAW === "") return 0.05; // même défaut que le routeur',
    '  if (COMMISSION_RATE_RAW == null || COMMISSION_RATE_RAW === "") return null; // R6 reste en rapport sans taux explicite',
)

# 3) R4: only bind when exactly one non-cancelled deal points at a thread.
path = "supabase/migrations/20260927121000_waouh_chat_reconcile.sql"
old_r4 = """  -- R4 — le thread ne connaît pas son deal actif.
  SELECT count(*) INTO v_count
  FROM public.waouh_chat_threads t JOIN public.waouh_deals d ON d.thread_id = t.id
  WHERE t.deal_id IS NULL AND d.status <> 'cancelled';
  v_report := v_report || jsonb_build_object('r4_threads_missing_deal_link', v_count);
  IF v_apply AND v_count > 0 THEN
    UPDATE public.waouh_chat_threads t
    SET deal_id = d.id, updated_at = now()
    FROM public.waouh_deals d
    WHERE d.thread_id = t.id AND t.deal_id IS NULL AND d.status <> 'cancelled';
  END IF;
"""
new_r4 = """  -- R4 — le thread ne connaît pas son deal actif.
  -- On ne répare QUE si un unique deal non annulé pointe vers le thread.
  -- Plusieurs deals = anomalie à examiner, jamais de choix arbitraire.
  WITH deal_candidates AS (
    SELECT
      t.id AS thread_id,
      count(DISTINCT d.id) AS deal_count,
      min(d.id::text)::uuid AS deal_id
    FROM public.waouh_chat_threads t
    JOIN public.waouh_deals d ON d.thread_id = t.id
    WHERE t.deal_id IS NULL
      AND d.status <> 'cancelled'
    GROUP BY t.id
  )
  SELECT
    count(*) FILTER (WHERE deal_count = 1),
    count(*) FILTER (WHERE deal_count > 1)
  INTO v_count, v_count2
  FROM deal_candidates;
  v_report := v_report || jsonb_build_object(
    'r4_threads_missing_deal_link', v_count,
    'r4_threads_ambiguous_deals', v_count2
  );
  IF v_apply AND v_count > 0 THEN
    WITH unique_deals AS (
      SELECT
        t.id AS thread_id,
        min(d.id::text)::uuid AS deal_id
      FROM public.waouh_chat_threads t
      JOIN public.waouh_deals d ON d.thread_id = t.id
      WHERE t.deal_id IS NULL
        AND d.status <> 'cancelled'
      GROUP BY t.id
      HAVING count(DISTINCT d.id) = 1
    )
    UPDATE public.waouh_chat_threads t
    SET deal_id = u.deal_id, updated_at = now()
    FROM unique_deals u
    WHERE t.id = u.thread_id
      AND t.deal_id IS NULL;
  END IF;
"""
replace_once(path, old_r4, new_r4)

# 4) Public health-check stays unchanged: detailed integrity telemetry remains
# admin-only through waouh-chat-reconcile.
path = "supabase/functions/waouh-health-check/index.ts"
text = read(path)
health_block = """    // 5) Intégrité du chat (plan du 27/09/2026) : même mesure que la
    //    réconciliation, en lecture seule. Absente tant que la migration
    //    20260927121000 n'est pas appliquée.
    let chatIntegrity: Record<string, unknown> = { available: false };
    try {
      const { data: integrity, error: integrityError } = await sb.rpc(
        "waouh_reconcile_chat_integrity",
        { p_mode: "report" },
      );
      if (!integrityError && integrity) chatIntegrity = { available: true, ...(integrity as Record<string, unknown>) };
    } catch (_) {
      // Fonction pas encore déployée : le health-check reste valide.
    }

"""
if health_block not in text:
    raise SystemExit("health-check chat integrity block missing")
text = text.replace(health_block, "", 1)
line = "        chat_integrity: chatIntegrity,\n"
if line not in text:
    raise SystemExit("health-check response field missing")
text = text.replace(line, "", 1)
write(path, text)

# 5) Negotiation router: actor must be explicitly one and only one party.
path = "supabase/functions/waouh-negotiation-router/index.ts"
old = """    const isBuyer = siblingIds.includes(neg.buyer_user_id);
    const otherUserId = isBuyer ? neg.seller_user_id : neg.buyer_user_id;
    const amount = Number(neg.last_offer_price || 0);
    const actorRole: "buyer" | "seller" = isBuyer ? "buyer" : "seller";
"""
new = """    const isBuyer = siblingIds.includes(neg.buyer_user_id);
    const isSeller = siblingIds.includes(neg.seller_user_id);
    if (isBuyer === isSeller) {
      return new Response(JSON.stringify({
        ok: false,
        reason: "actor_not_unambiguous_party",
        reply: "⚠️ Cette négociation ne peut pas être modifiée depuis cette identité.",
        negotiation_id: neg.id,
        thread_id: activeThreadId,
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const actorRole: "buyer" | "seller" = isBuyer ? "buyer" : "seller";
    const otherUserId = isBuyer ? neg.seller_user_id : neg.buyer_user_id;
    const amount = Number(neg.last_offer_price || 0);
"""
replace_once(path, old, new)

# 6) Webhook delegation: never infer seller when actor is not a party.
path = "supabase/functions/waouh-webhook/index.ts"
old = """  const actorId = siblingIds.includes(neg.buyer_user_id) ? neg.buyer_user_id : neg.seller_user_id;
  // Plusieurs négociations ouvertes : on ne devine pas laquelle est visée
"""
new = """  const actorIsBuyer = siblingIds.includes(neg.buyer_user_id);
  const actorIsSeller = siblingIds.includes(neg.seller_user_id);
  if (actorIsBuyer === actorIsSeller) {
    return {
      reply: "⚠️ Cette négociation ne peut pas être modifiée depuis cette identité.",
      intent: "negotiation_actor_invalid",
      actions: [],
    };
  }
  const actorId = actorIsBuyer ? neg.buyer_user_id : neg.seller_user_id;
  // Plusieurs négociations ouvertes : on ne devine pas laquelle est visée
"""
replace_once(path, old, new)

# 7) Documentation: state the safe rollout actually delivered.
path = "docs/WAOUH_CHAT_THREAD_MIGRATION.md"
text = read(path)
text = text.replace(
    "| `supabase/migrations/20260927120500_…_backfill.sql` | Rattache les anciens messages à leur thread **uniquement sans ambiguïté** ; vue de suivi `waouh_messages_without_thread` (sans accès public). | — |",
    "| `supabase/migrations/20260927120500_…_backfill.sql` | Installe le backfill et la vue de suivi, **sans exécuter automatiquement le backfill**. L'historique est traité ensuite par lots audités et uniquement sans ambiguïté. | — |",
)
text = text.replace(
    "| `waouh-health-check` | Ajoute `chat_integrity` (compteurs seulement, aucun identifiant). | A |",
    "| `waouh-health-check` | Inchangé : aucune télémétrie d'intégrité supplémentaire n'est exposée publiquement. | — |",
)
write(path, text)

# 8) SQL verification explicitly executes the manual backfill in the LOCAL test DB.
path = "scripts/waouh-chat/verify/20_backfill_reconcile.sql"
text = read(path)
marker = "-- B1 — backfill : sûr uniquement, identités multiples comprises.\n"
if marker not in text:
    raise SystemExit("SQL backfill test marker missing")
manual_test = """-- Le backfill production est volontairement manuel. Le banc LOCAL l'exécute
-- explicitement afin de vérifier son comportement sans réintroduire une
-- mutation automatique dans la migration.
SELECT public.waouh_backfill_message_threads(5000, NULL);

"""
text = text.replace(marker, manual_test + marker, 1)
write(path, text)

# 9) Existing Web parity CI must understand canonical route constants.
path = "scripts/verify-waouh-web-parity.mjs"
text = read(path)
old = """for (const [label, route] of canonicalDesktopRoutes) {
  must(sidebar, `label: '${label}', to: '${route}'`, `Desktop canonical route mismatch: ${label} -> ${route}`);
}
"""
new = """for (const [label, route] of canonicalDesktopRoutes) {
  const literal = `label: '${label}', to: '${route}'`;
  const chatViaConstant =
    label === "Chat Command Center" &&
    route === "/app/chat" &&
    sidebar.includes("const CHAT_PATH = '/app/chat';") &&
    sidebar.includes("label: 'Chat Command Center', to: CHAT_PATH");
  if (!sidebar.includes(literal) && !chatViaConstant) {
    fail(`Desktop canonical route mismatch: ${label} -> ${route}`);
  }
}
"""
if old not in text:
    raise SystemExit("web parity canonical route anchor missing")
text = text.replace(old, new, 1)
write(path, text)

# 10) Compatibility checkpoint: server-side Chat v2 changes require no Flutter
# runtime change, but this marker intentionally triggers the existing Flutter CI
# after merge so the APK is rebuilt from the exact integrated prod commit.
compat = """# WAOUH Chat v2 — server compatibility checkpoint

This marker documents that the 27/09/2026 canonical-thread / single-writer
server integration is compatible with the Flutter production entry point
`lib/live/live_app_production.dart`.

No Flutter runtime code is changed by this lot. Its presence under
`flutter_waouh_app/` intentionally triggers the existing Flutter CI so an
optimized ARM64 APK is rebuilt from the exact integrated production commit.
"""
write("flutter_waouh_app/WAOUH_CHAT_V2_SERVER_COMPATIBILITY.md", compat)

# 11) Safety assertions
backfill = read("supabase/migrations/20260927120500_waouh_chat_messages_thread_backfill.sql")
assert "v_res := public.waouh_backfill_message_threads(5000, v_cursor)" not in backfill
assert "public.waouh_same_person(m.user_id, t.buyer_user_id)" in backfill
assert "return 0.05" not in read("supabase/functions/waouh-chat-reconcile/index.ts")
assert "r4_threads_ambiguous_deals" in read("supabase/migrations/20260927121000_waouh_chat_reconcile.sql")
assert "chat_integrity: chatIntegrity" not in read("supabase/functions/waouh-health-check/index.ts")
assert "actor_not_unambiguous_party" in read("supabase/functions/waouh-negotiation-router/index.ts")
assert "negotiation_actor_invalid" in read("supabase/functions/waouh-webhook/index.ts")
assert "SELECT public.waouh_backfill_message_threads(5000, NULL);" in read("scripts/waouh-chat/verify/20_backfill_reconcile.sql")
assert "chatViaConstant" in read("scripts/verify-waouh-web-parity.mjs")
assert Path("flutter_waouh_app/WAOUH_CHAT_V2_SERVER_COMPATIBILITY.md").exists()
print("WAOUH Chat v2 hardening recommendations applied.")
