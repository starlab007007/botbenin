import { useCallback, useEffect, useState } from 'react';

/**
 * Stocke localement (localStorage) les catégories personnalisées saisies
 * par le partenaire et les fusionne avec une liste de base, sans doublon
 * (insensible à la casse et aux espaces).
 *
 * @param bucket nom logique (ex: 'business', 'product')
 * @param base liste de catégories par défaut
 */
export function useCustomCategories(bucket: string, base: readonly string[]) {
  const storageKey = `waouh:custom-cat:${bucket}`;
  const [custom, setCustom] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setCustom(parsed.filter((x) => typeof x === 'string'));
      }
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  const persist = useCallback(
    (next: string[]) => {
      setCustom(next);
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* quota/safari private */
      }
    },
    [storageKey],
  );

  const add = useCallback(
    (rawValue: string) => {
      const v = (rawValue || '').trim();
      if (!v) return;
      const norm = v.toLowerCase();
      const exists =
        base.some((b) => b.toLowerCase() === norm) ||
        custom.some((c) => c.toLowerCase() === norm);
      if (exists) return;
      persist([v, ...custom].slice(0, 50));
    },
    [base, custom, persist],
  );

  // Merge sans doublon, custom en tête pour visibilité
  const seen = new Set<string>();
  const all: string[] = [];
  for (const list of [custom, base as string[]]) {
    for (const item of list) {
      const k = item.trim().toLowerCase();
      if (!k || seen.has(k)) continue;
      seen.add(k);
      all.push(item);
    }
  }

  return { all, add, custom };
}
