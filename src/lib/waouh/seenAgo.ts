// Libellés « vu il y a … » et provenance lisible d'une fiche, partagés par les résultats.
export function seenAgo(iso?: string | null, now = Date.now()): string {
  const t = iso ? Date.parse(iso) : NaN;
  if (!Number.isFinite(t)) return "Date non précisée";
  const h = Math.max(0, Math.floor((now - t) / 3_600_000));
  if (h < 1) return "Vu à l'instant";
  if (h < 24) return `Vu il y a ${h} h`;
  const d = Math.floor(h / 24);
  return d < 31 ? `Vu il y a ${d} j` : `Vu le ${new Date(t).toLocaleDateString("fr-FR")}`;
}
export function sourceLabel(url?: string | null): string {
  if (!url) return "WAOUH";
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host.includes("coinafrique")) return "CoinAfrique";
    if (host.includes("bambaad")) return "BambaAd";
    if (host.includes("afribaba")) return "Afribaba";
    if (host.includes("facebook")) return "Facebook";
    return host;
  } catch { return "Source en ligne"; }
}
