/** Keep canonical identifiers while the Chat route mounts; never reopen by title alone. */
export function openCommerceDiscussion(detail: Record<string, unknown>, navigate: (path: string) => void) {
  if (!detail.thread_id && !detail.article_id) return false;
  try {
    let stored: unknown;
    try { stored = JSON.parse(localStorage.getItem("waouh_pending_open") || "[]"); } catch { stored = []; }
    const previous = Array.isArray(stored) ? stored : [];
    const queue = detail.thread_id ? previous.filter(item => item?.thread_id !== detail.thread_id) : previous;
    localStorage.setItem("waouh_pending_open", JSON.stringify([...queue, detail].slice(-10)));
  } catch { /* Storage may be unavailable; use the live event as well. */ }
  navigate("/app/chat");
  window.setTimeout(() => window.dispatchEvent(new CustomEvent("waouh:open-match-chat", { detail })), 60);
  return true;
}
