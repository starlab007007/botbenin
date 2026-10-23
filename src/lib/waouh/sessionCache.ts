/** Browser state that must never survive an account boundary. */
const exactKeys = new Set([
  "waouh_web_session_id", "waouh_geo_v1", "waouh_pending_open",
  "waouh_main_thread_started_at", "waouh_guest_msg_count", "waouh_seen_status_ids",
]);
const prefixes = [
  "waouh_notifs_", "waouh_open_matches_", "waouh_active_match_", "waouh_archived_matches_",
  "waouh_chatlist_snapshot_v1:", "waouh_main_msgs_", "waouh_outbox_", "waouh.avatar.",
];

export function shouldResetWaouhSession(event: string, previousId: string | null, nextId: string | null): boolean {
  return event === "SIGNED_OUT" || (event === "SIGNED_IN" && previousId !== nextId);
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
