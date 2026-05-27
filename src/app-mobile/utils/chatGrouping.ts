/** Helpers for chat message grouping & day separators. */

export type GroupItem<T> =
  | { kind: "day"; key: string; label: string }
  | { kind: "msg"; key: string; msg: T; grouped: boolean; showMeta: boolean };

const GROUP_WINDOW_MS = 2 * 60 * 1000;

export function formatDayLabel(d: Date): string {
  const now = new Date();
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (sameDay(d, now)) return "Aujourd'hui";
  if (sameDay(d, y)) return "Hier";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: d.getFullYear() === now.getFullYear() ? undefined : "numeric" });
}

export function formatTime(d: Date): string {
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export function buildChatGroups<T extends { id: string; created_at: string; direction: string }>(
  msgs: T[]
): GroupItem<T>[] {
  const out: GroupItem<T>[] = [];
  let lastDayKey = "";
  for (let i = 0; i < msgs.length; i++) {
    const m = msgs[i];
    const d = new Date(m.created_at);
    const dayKey = d.toISOString().slice(0, 10);
    if (dayKey !== lastDayKey) {
      out.push({ kind: "day", key: `day-${dayKey}`, label: formatDayLabel(d) });
      lastDayKey = dayKey;
    }
    const prev = msgs[i - 1];
    const next = msgs[i + 1];
    const grouped = !!prev
      && prev.direction === m.direction
      && new Date(prev.created_at).toISOString().slice(0, 10) === dayKey
      && d.getTime() - new Date(prev.created_at).getTime() < GROUP_WINDOW_MS;
    const showMeta = !next
      || next.direction !== m.direction
      || new Date(next.created_at).getTime() - d.getTime() >= GROUP_WINDOW_MS;
    out.push({ kind: "msg", key: m.id, msg: m, grouped, showMeta });
  }
  return out;
}
