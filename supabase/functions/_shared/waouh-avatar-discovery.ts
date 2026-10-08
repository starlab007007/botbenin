// Preserve relevance while avoiding monopolisation by one source/person.
export function diversifyAvatarResults<T extends Record<string, any>>(ranked: T[], limit: number): T[] {
  const selected: T[] = [], deferred: T[] = [];
  const people = new Set<string>(), sources = new Map<string, number>();
  for (const row of ranked) {
    const person = row.entity_id || row.evidence?.entity_id || row.evidence?.seller_id || row.evidence?.user_id;
    if (person && people.has(String(person))) continue;
    const source = String(row.source_key || 'unknown');
    if ((sources.get(source) || 0) >= Math.max(1, Math.ceil(limit / 2))) { deferred.push(row); continue; }
    if (person) people.add(String(person));
    sources.set(source, (sources.get(source) || 0) + 1); selected.push(row);
    if (selected.length >= limit) return selected;
  }
  for (const row of deferred) {
    const person = row.entity_id || row.evidence?.entity_id || row.evidence?.seller_id || row.evidence?.user_id;
    if (person && people.has(String(person))) continue;
    if (person) people.add(String(person));
    selected.push(row); if (selected.length >= limit) break;
  }
  return selected;
}
