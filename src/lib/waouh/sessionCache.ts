/** Browser state that must never survive an account boundary. */
const exactKeys = new Set([
  "waouh_cache_owner_id", "waouh_web_session_id", "waouh_geo_v1", "waouh_pending_open",
  "waouh_main_thread_started_at", "waouh_guest_msg_count", "waouh_seen_status_ids",
]);
const prefixes = [
  "waouh_notifs_", "waouh_open_matches_", "waouh_active_match_", "waouh_archived_matches_",
  "waouh_chatlist_snapshot_v1:", "waouh_main_msgs_", "waouh_outbox_", "waouh.avatar.",
];

export function shouldResetWaouhSession(event: string, previousId: string | null, nextId: string | null): boolean {
  return event === "SIGNED_OUT" || (previousId !== nextId && (previousId !== null || event === "SIGNED_IN"));
}

export function clearWaouhAccountCache(
  storage: Pick<Storage, "length" | "key" | "removeItem"> = localStorage,
  tabStorage: Pick<Storage, "removeItem"> = sessionStorage,
): void {
  try {
    const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index));
    for (const key of keys) {
      if (key && (exactKeys.has(key) || prefixes.some(prefix => key.startsWith(prefix)))) storage.removeItem(key);
    }
    tabStorage.removeItem("waouh_post_auth_redirect");
  } catch { /* Storage can be disabled; sign-out must still complete. */ }
}

/** Local cache attribution only; server authorization always comes from the verified JWT. */
export function readWaouhCacheOwner(storage: Pick<Storage, "getItem"> = localStorage): string | null {
  try { return storage.getItem("waouh_cache_owner_id") || null; } catch { return null; }
}

export function writeWaouhCacheOwner(ownerId: string | null, storage: Pick<Storage, "setItem" | "removeItem"> = localStorage): void {
  try {
    if (ownerId) storage.setItem("waouh_cache_owner_id", ownerId);
    else storage.removeItem("waouh_cache_owner_id");
  } catch { /* A disabled storage must not block auth. */ }
}
